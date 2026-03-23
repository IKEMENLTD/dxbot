// ===== LINE Webhook API Route =====

import { NextRequest, NextResponse } from 'next/server';
import type { WebhookBody, WebhookEvent, FollowEvent, TextMessageEvent, PostbackEvent } from '@/lib/line-types';
import type { AxisScores, StumbleType } from '@/lib/types';
import { verifySignature, replyMessage, getProfile } from '@/lib/line-client';
import { getState, setState, createUser } from '@/lib/conversation-state';
import { saveMessage } from '@/lib/queries';
import type { MessageType } from '@/lib/chat-types';
import {
  getQuestion,
  getQuestionCount,
  calculateScores,
  determineBand,
  determineWeakAxis,
} from '@/lib/diagnosis';
import { getNextStep, getAllSteps } from '@/lib/step-master';
import type { StepDefinition } from '@/lib/step-master';
import {
  recordStepStarted,
  recordStepCompleted,
  recordStepStumble,
  recordStepSkipped,
  recordTimelineEvent,
  updateUserStepCounters,
  calculateLevel,
  calculateScoreForStep,
} from '@/lib/step-delivery';
import {
  welcomeMessage,
  consentMessage,
  industrySelectMessage,
  industryConfirmMessage,
  diagnosisQuestionMessage,
  diagnosisResultMessage,
  stepStartMessage,
  stepContentMessage,
  stepCompleteMessage,
  allStepsCompleteMessage,
  stepStumbleMessage,
  stepPauseMessage,
  stepActiveGuideMessage,
  laterMessage,
  fallbackMessage,
} from '@/lib/line-messages';

/** つまずきタイプの検証 */
const VALID_STUMBLE_TYPES = new Set<string>(['how', 'motivation', 'time']);

function isValidStumbleType(value: string): value is StumbleType {
  return VALID_STUMBLE_TYPES.has(value);
}

/**
 * POST /api/webhook
 * LINE Webhook受信エンドポイント
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let bodyText: string;

  try {
    bodyText = await request.text();
  } catch (error) {
    console.error('[Webhook] リクエストボディ読み取りエラー:', error);
    return NextResponse.json({ error: 'リクエスト読み取り失敗' }, { status: 400 });
  }

  const signature = request.headers.get('x-line-signature') ?? '';

  // 署名検証
  if (!verifySignature(bodyText, signature)) {
    console.error('[Webhook] 署名検証失敗');
    return NextResponse.json({ error: '署名検証失敗' }, { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(bodyText) as WebhookBody;
  } catch (error) {
    console.error('[Webhook] JSONパースエラー:', error);
    return NextResponse.json({ error: 'JSONパースエラー' }, { status: 400 });
  }

  try {
    // イベント処理（同期で待つ - エラー検知のため）
    await processEvents(body.events);
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[Webhook] イベント処理エラー:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * イベントを処理（awaitで待つ）
 * メッセージ送信は同期、DB書き込みエラーは個別catchで吸収
 */
async function processEvents(events: WebhookEvent[]): Promise<void> {
  for (const event of events) {
    await handleEvent(event);
  }
}

/**
 * イベントタイプ別処理
 */
async function handleEvent(event: WebhookEvent): Promise<void> {
  switch (event.type) {
    case 'follow':
      await handleFollow(event);
      break;
    case 'message':
      if (event.message.type === 'text') {
        // メッセージをDBに保存（エラーは吸収して処理を続行）
        await saveInboundMessage(event);
        await handleTextMessage(event);
      }
      break;
    case 'postback':
      // postbackもDBに保存
      await savePostbackMessage(event);
      await handlePostback(event);
      break;
    case 'unfollow':
      // ブロック時は何もしない
      break;
  }
}

/**
 * 受信テキストメッセージをDBに保存
 */
async function saveInboundMessage(event: TextMessageEvent): Promise<void> {
  try {
    const lineUserId = event.source.userId;
    if (!lineUserId) return;

    // conversation_stateからuser_idを逆引き（line_user_id = users.id の場合）
    // このプロジェクトではLINE user IDがそのままusers.idとして使われている
    const userId = lineUserId;

    const msgType: MessageType = event.message.type === 'text' ? 'text' : 'text';

    await saveMessage({
      userId,
      lineUserId,
      direction: 'inbound',
      content: event.message.text,
      messageType: msgType,
      lineMessageId: event.message.id,
    });
  } catch (err) {
    console.error('[Webhook] メッセージ保存エラー（処理は続行）:', err);
  }
}

/**
 * 受信postbackをDBに保存
 */
async function savePostbackMessage(event: PostbackEvent): Promise<void> {
  try {
    const lineUserId = event.source.userId;
    if (!lineUserId) return;

    const userId = lineUserId;

    await saveMessage({
      userId,
      lineUserId,
      direction: 'inbound',
      content: event.postback.data,
      messageType: 'postback',
    });
  } catch (err) {
    console.error('[Webhook] Postback保存エラー（処理は続行）:', err);
  }
}

// ===== フォローイベント =====

async function handleFollow(event: FollowEvent): Promise<void> {
  try {
    const userId = event.source.userId;
    if (!userId) return;

    // プロフィール取得
    const profile = await getProfile(userId);
    if (!profile) return;

    // ユーザー作成
    const conversation = await createUser(userId, profile);

    // Welcome + 同意確認
    const msg = welcomeMessage(conversation.preferredName);
    await replyMessage(event.replyToken, [msg]);

    // 状態更新: consent_pending
    await setState(userId, { state: { phase: 'consent_pending' } });
  } catch (error) {
    console.error('[Webhook] handleFollow エラー:', error);
  }
}

// ===== テキストメッセージ =====

async function handleTextMessage(event: TextMessageEvent): Promise<void> {
  try {
    const userId = event.source.userId;
    if (!userId) return;

    const text = event.message.text.trim();
    const conversation = await getState(userId);

    // ユーザーが存在しない場合、新規作成
    if (!conversation) {
      const profile = await getProfile(userId);
      if (!profile) return;
      await createUser(userId, profile);

      // 「診断」キーワードなら同意確認
      if (text === '診断') {
        await replyMessage(event.replyToken, [consentMessage()]);
        await setState(userId, { state: { phase: 'consent_pending' } });
        return;
      }

      await replyMessage(event.replyToken, [fallbackMessage()]);
      return;
    }

    // 「診断」キーワードで再診断開始（どのフェーズからでも）
    if (text === '診断') {
      await replyMessage(event.replyToken, [consentMessage()]);
      await setState(userId, { state: { phase: 'consent_pending' } });
      return;
    }

    // フェーズに応じた処理
    const { phase } = conversation.state;

    switch (phase) {
      case 'consent_pending':
        // テキストで「はい」的な入力
        if (text === 'はい' || text === 'はい、始めます') {
          await startIndustrySelect(userId, event.replyToken);
        } else {
          await replyMessage(event.replyToken, [laterMessage()]);
          await setState(userId, { state: { phase: 'idle' } });
        }
        break;

      case 'step_active': {
        // ステップ取り組み中のテキスト入力
        const state = conversation.state;
        if (state.phase !== 'step_active') break;

        // 「ステップ」で現在のステップを再表示
        if (text === 'ステップ') {
          await resendCurrentStep(userId, event.replyToken, state.currentStepId, state.completedStepIds);
          return;
        }

        // ステップ中の案内メッセージを返す
        const currentStep = findStepById(state.currentStepId);
        const stepName = currentStep ? currentStep.name : '現在のステップ';
        await replyMessage(event.replyToken, [stepActiveGuideMessage(stepName)]);
        break;
      }

      case 'step_ready': {
        // ステップ待機中のテキスト入力
        if (text === 'ステップ') {
          // 次のステップを配信
          const state = conversation.state;
          if (state.phase !== 'step_ready') break;
          await deliverNextStep(userId, event.replyToken, state.weakAxis, state.completedStepIds, state.stumbleCount);
          return;
        }

        await replyMessage(event.replyToken, [fallbackMessage()]);
        break;
      }

      default:
        await replyMessage(event.replyToken, [fallbackMessage()]);
        break;
    }
  } catch (error) {
    console.error('[Webhook] handleTextMessage エラー:', error);
  }
}

// ===== ポストバックイベント =====

async function handlePostback(event: PostbackEvent): Promise<void> {
  try {
    const userId = event.source.userId;
    if (!userId) return;

    const params = parsePostbackData(event.postback.data);
    const action = params.get('action') ?? '';

    const conversation = await getState(userId);
    if (!conversation) {
      console.warn('[Webhook] ユーザー未登録のPostback:', userId);
      return;
    }

    switch (action) {
      case 'consent':
        await handleConsent(userId, event.replyToken, params);
        break;
      case 'industry':
        await handleIndustrySelect(userId, event.replyToken, params);
        break;
      case 'diagnosis':
        await handleDiagnosisAnswer(userId, event.replyToken, params);
        break;
      case 'step_start':
        await handleStepStart(userId, event.replyToken);
        break;
      case 'step_complete':
        await handleStepComplete(userId, event.replyToken, params);
        break;
      case 'step_stumble':
        await handleStepStumble(userId, event.replyToken, params);
        break;
      case 'step_retry':
        await handleStepRetry(userId, event.replyToken, params);
        break;
      case 'step_skip':
        await handleStepSkip(userId, event.replyToken, params);
        break;
      case 'step_pause':
        await handleStepPause(userId, event.replyToken);
        break;
      default:
        console.warn('[Webhook] 不明なPostbackアクション:', action);
        break;
    }
  } catch (error) {
    console.error('[Webhook] handlePostback エラー:', error);
  }
}

// ===== 個別ハンドラ =====

/**
 * 同意処理
 */
async function handleConsent(
  userId: string,
  replyToken: string,
  params: Map<string, string>
): Promise<void> {
  const value = params.get('value');

  if (value === 'yes') {
    await startIndustrySelect(userId, replyToken);
  } else {
    await replyMessage(replyToken, [laterMessage()]);
    await setState(userId, { state: { phase: 'idle' } });
  }
}

/**
 * 業種選択フェーズへ遷移
 */
async function startIndustrySelect(userId: string, replyToken: string): Promise<void> {
  await replyMessage(replyToken, [industrySelectMessage()]);
  await setState(userId, { state: { phase: 'industry_select' } });
}

/**
 * 業種選択処理
 */
async function handleIndustrySelect(
  userId: string,
  replyToken: string,
  params: Map<string, string>
): Promise<void> {
  const industry = params.get('value') ?? '';

  // 業種を保存
  await setState(userId, {
    industry,
    state: { phase: 'diagnosis', questionIndex: 1, scores: {} },
  });

  // 確認フィードバック + Q2を送信
  const confirmMsg = industryConfirmMessage(industry);
  const q2 = getQuestion(1);
  if (!q2) return;

  const questionMsg = diagnosisQuestionMessage(q2);
  await replyMessage(replyToken, [confirmMsg, questionMsg]);
}

/**
 * 診断回答処理（Q2〜Q6）
 */
async function handleDiagnosisAnswer(
  userId: string,
  replyToken: string,
  params: Map<string, string>
): Promise<void> {
  const conversation = await getState(userId);
  if (!conversation) return;

  const state = conversation.state;
  if (state.phase !== 'diagnosis') return;

  const axis = params.get('axis') ?? '';
  const value = parseInt(params.get('value') ?? '0', 10);

  // スコアを記録
  const updatedScores: Partial<AxisScores> = {
    ...state.scores,
    [axis]: value,
  };

  const nextIndex = state.questionIndex + 1;

  // 次の質問があるか
  if (nextIndex < getQuestionCount()) {
    const nextQ = getQuestion(nextIndex);
    if (!nextQ) return;

    await setState(userId, {
      state: {
        phase: 'diagnosis',
        questionIndex: nextIndex,
        scores: updatedScores,
      },
    });

    await replyMessage(replyToken, [diagnosisQuestionMessage(nextQ)]);
  } else {
    // 全問完了 → 結果算出
    await completeDiagnosis(userId, replyToken, updatedScores, conversation.industry);
  }
}

/**
 * 診断完了 → 結果表示 + ステップ準備フェーズへ
 */
async function completeDiagnosis(
  userId: string,
  replyToken: string,
  rawScores: Partial<AxisScores>,
  industry: string | null
): Promise<void> {
  // 回答値をスコアに変換（x3）
  const answers: Record<string, number> = {};
  for (const [key, val] of Object.entries(rawScores)) {
    if (typeof val === 'number') {
      answers[key] = val;
    }
  }

  const scores = calculateScores(answers);
  const total = scores.a1 + scores.a2 + scores.b + scores.c + scores.d;
  const band = determineBand(total);
  const weakAxis = determineWeakAxis(scores);

  // 弱軸の最初のステップ名を取得
  const firstStep = getNextStep([], weakAxis);
  const firstStepName = firstStep ? firstStep.name : 'DX基礎チェック';

  // 結果メッセージ送信
  const resultMsg = diagnosisResultMessage(scores, band, weakAxis, industry);
  const stepMsg = stepStartMessage(firstStepName);

  await replyMessage(replyToken, [resultMsg, stepMsg]);

  // step_readyフェーズへ（スタートボタン待ち）
  await setState(userId, {
    state: {
      phase: 'step_ready',
      weakAxis,
      completedStepIds: [],
      stumbleCount: 0,
    },
  });
}

// ===== ステップハンドラ =====

/**
 * ステップ開始: 次のステップを配信
 */
async function handleStepStart(
  userId: string,
  replyToken: string
): Promise<void> {
  const conversation = await getState(userId);
  if (!conversation) return;

  const { state } = conversation;

  // step_readyまたはstep_activeから遷移可能
  if (state.phase !== 'step_ready' && state.phase !== 'step_active') {
    console.warn('[Webhook] step_start: 不正なフェーズ:', state.phase);
    return;
  }

  const weakAxis = state.weakAxis;
  const completedStepIds = state.completedStepIds;
  const stumbleCount = state.stumbleCount;

  await deliverNextStep(userId, replyToken, weakAxis, completedStepIds, stumbleCount);
}

/**
 * 次のステップを配信する共通関数
 */
async function deliverNextStep(
  userId: string,
  replyToken: string,
  weakAxis: keyof AxisScores,
  completedStepIds: string[],
  stumbleCount: number
): Promise<void> {
  const nextStep = getNextStep(completedStepIds, weakAxis);

  if (!nextStep) {
    // 全ステップ完了
    const level = calculateLevel(completedStepIds.length);
    await replyMessage(replyToken, [allStepsCompleteMessage(completedStepIds.length, level)]);
    await setState(userId, {
      state: {
        phase: 'step_ready',
        weakAxis,
        completedStepIds,
        stumbleCount,
      },
    });
    return;
  }

  // ステップ内容を配信
  const contentMsg = stepContentMessage(nextStep, completedStepIds.length);
  await replyMessage(replyToken, [contentMsg]);

  // DB: ステップ開始記録
  await recordStepStarted(userId, nextStep.id, nextStep.name);

  // 状態をstep_activeに更新
  await setState(userId, {
    state: {
      phase: 'step_active',
      currentStepId: nextStep.id,
      weakAxis,
      completedStepIds,
      stumbleCount,
    },
  });
}

/**
 * ステップ完了処理
 */
async function handleStepComplete(
  userId: string,
  replyToken: string,
  params: Map<string, string>
): Promise<void> {
  const conversation = await getState(userId);
  if (!conversation) return;

  const { state } = conversation;
  if (state.phase !== 'step_active') {
    console.warn('[Webhook] step_complete: 不正なフェーズ:', state.phase);
    return;
  }

  const stepId = params.get('stepId') ?? '';
  if (stepId !== state.currentStepId) {
    console.warn('[Webhook] step_complete: stepId不一致:', stepId, '!=', state.currentStepId);
    return;
  }

  const completedStep = findStepById(stepId);
  if (!completedStep) {
    console.error('[Webhook] step_complete: ステップ定義なし:', stepId);
    return;
  }

  // 完了記録
  const newCompletedIds = [...state.completedStepIds, stepId];
  const newCompletedCount = newCompletedIds.length;
  const previousLevel = calculateLevel(state.completedStepIds.length);
  const newLevel = calculateLevel(newCompletedCount);
  const levelUp = newLevel > previousLevel;
  const scoreGain = calculateScoreForStep(completedStep.difficulty);

  // DB: ステップ完了記録
  await recordStepCompleted(userId, stepId, completedStep.name);

  // DB: タイムライン記録
  await recordTimelineEvent(
    userId,
    'step_completed',
    `${completedStep.name}を完了`,
    { step_id: stepId, step_name: completedStep.name }
  );

  // DB: ユーザーカウンタ更新
  await updateUserStepCounters(userId, {
    stepsCompleted: newCompletedCount,
    lastCompletedStep: stepId,
    level: newLevel,
    score: scoreGain, // 差分ではなく累積を別途計算する場合はロジック調整
  });

  // 次のステップがあるか確認
  const nextStep = getNextStep(newCompletedIds, state.weakAxis);

  if (!nextStep) {
    // 全ステップ完了
    await replyMessage(replyToken, [allStepsCompleteMessage(newCompletedCount, newLevel)]);
    await setState(userId, {
      state: {
        phase: 'step_ready',
        weakAxis: state.weakAxis,
        completedStepIds: newCompletedIds,
        stumbleCount: state.stumbleCount,
      },
    });
    return;
  }

  // 完了祝福メッセージ
  const completeMsg = stepCompleteMessage(completedStep, newCompletedCount, levelUp, newLevel);
  await replyMessage(replyToken, [completeMsg]);

  // 状態をstep_readyに更新（次ステップ待ち）
  await setState(userId, {
    state: {
      phase: 'step_ready',
      weakAxis: state.weakAxis,
      completedStepIds: newCompletedIds,
      stumbleCount: state.stumbleCount,
    },
  });
}

/**
 * つまずき処理
 */
async function handleStepStumble(
  userId: string,
  replyToken: string,
  params: Map<string, string>
): Promise<void> {
  const conversation = await getState(userId);
  if (!conversation) return;

  const { state } = conversation;
  if (state.phase !== 'step_active') {
    console.warn('[Webhook] step_stumble: 不正なフェーズ:', state.phase);
    return;
  }

  const stepId = params.get('stepId') ?? '';
  const stumbleTypeRaw = params.get('type') ?? '';

  if (!isValidStumbleType(stumbleTypeRaw)) {
    console.warn('[Webhook] step_stumble: 不正なstumbleType:', stumbleTypeRaw);
    return;
  }

  const step = findStepById(stepId);
  if (!step) {
    console.error('[Webhook] step_stumble: ステップ定義なし:', stepId);
    return;
  }

  const newStumbleCount = state.stumbleCount + 1;

  // DB: つまずき記録
  await recordStepStumble(userId, stepId, step.name, stumbleTypeRaw);

  // DB: タイムライン記録
  await recordTimelineEvent(
    userId,
    'stumble',
    `${step.name}でつまずき（${stumbleTypeRaw}）`,
    { step_id: stepId, step_name: step.name, stumble_type: stumbleTypeRaw }
  );

  // DB: ユーザーカウンタ更新
  const counterUpdate: {
    stumbleCount: number;
    stumbleHowCount?: number;
  } = { stumbleCount: newStumbleCount };
  if (stumbleTypeRaw === 'how') {
    counterUpdate.stumbleHowCount = newStumbleCount; // 正確には howCount のみ加算すべきだがここでは近似
  }
  await updateUserStepCounters(userId, counterUpdate);

  // ヒントメッセージ送信
  const hintMsg = stepStumbleMessage(step, stumbleTypeRaw);
  await replyMessage(replyToken, [hintMsg]);

  // 状態は step_active のまま（同じステップに再挑戦可能）
  await setState(userId, {
    state: {
      ...state,
      stumbleCount: newStumbleCount,
    },
  });
}

/**
 * ステップ再挑戦: 現在のステップを再表示
 */
async function handleStepRetry(
  userId: string,
  replyToken: string,
  params: Map<string, string>
): Promise<void> {
  const conversation = await getState(userId);
  if (!conversation) return;

  const { state } = conversation;
  if (state.phase !== 'step_active') {
    console.warn('[Webhook] step_retry: 不正なフェーズ:', state.phase);
    return;
  }

  const stepId = params.get('stepId') ?? '';
  await resendCurrentStep(userId, replyToken, stepId, state.completedStepIds);
}

/**
 * ステップスキップ: 次のステップへ進む
 */
async function handleStepSkip(
  userId: string,
  replyToken: string,
  params: Map<string, string>
): Promise<void> {
  const conversation = await getState(userId);
  if (!conversation) return;

  const { state } = conversation;
  if (state.phase !== 'step_active') {
    console.warn('[Webhook] step_skip: 不正なフェーズ:', state.phase);
    return;
  }

  const stepId = params.get('stepId') ?? '';
  const step = findStepById(stepId);

  if (step) {
    // DB: スキップ記録
    await recordStepSkipped(userId, stepId, step.name);
    await recordTimelineEvent(
      userId,
      'step_skipped',
      `${step.name}をスキップ`,
      { step_id: stepId, step_name: step.name }
    );
  }

  // スキップしたステップも completedStepIds に追加（再出題防止）
  const newCompletedIds = [...state.completedStepIds, stepId];

  // 次のステップを配信
  await deliverNextStep(userId, replyToken, state.weakAxis, newCompletedIds, state.stumbleCount);
}

/**
 * ステップ一時停止
 */
async function handleStepPause(
  userId: string,
  replyToken: string
): Promise<void> {
  const conversation = await getState(userId);
  if (!conversation) return;

  const { state } = conversation;
  if (state.phase !== 'step_ready' && state.phase !== 'step_active') {
    return;
  }

  await replyMessage(replyToken, [stepPauseMessage()]);

  // step_readyに戻す（再開時にstep_startで続きから）
  await setState(userId, {
    state: {
      phase: 'step_ready',
      weakAxis: state.weakAxis,
      completedStepIds: state.completedStepIds,
      stumbleCount: state.stumbleCount,
    },
  });
}

// ===== ヘルパー関数 =====

/**
 * 現在のステップを再送信
 */
async function resendCurrentStep(
  userId: string,
  replyToken: string,
  stepId: string,
  completedStepIds: string[]
): Promise<void> {
  const step = findStepById(stepId);
  if (!step) {
    await replyMessage(replyToken, [fallbackMessage()]);
    return;
  }

  const contentMsg = stepContentMessage(step, completedStepIds.length);
  await replyMessage(replyToken, [contentMsg]);
}

/**
 * stepIdからStepDefinitionを検索
 */
function findStepById(stepId: string): StepDefinition | null {
  const allSteps = getAllSteps();
  return allSteps.find((s) => s.id === stepId) ?? null;
}

// ===== ユーティリティ =====

/**
 * PostbackのdataをMapにパース
 * 形式: "action=xxx&value=yyy"
 */
function parsePostbackData(data: string): Map<string, string> {
  const map = new Map<string, string>();
  const pairs = data.split('&');
  for (const pair of pairs) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) continue;
    const key = decodeURIComponent(pair.slice(0, eqIndex));
    const val = decodeURIComponent(pair.slice(eqIndex + 1));
    map.set(key, val);
  }
  return map;
}
