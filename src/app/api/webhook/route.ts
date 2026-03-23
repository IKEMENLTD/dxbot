// ===== LINE Webhook API Route =====

import { NextRequest, NextResponse } from 'next/server';
import type { WebhookBody, WebhookEvent, FollowEvent, TextMessageEvent, PostbackEvent, LineMessage } from '@/lib/line-types';
import type { AxisScores, StumbleType } from '@/lib/types';
import { verifySignature, replyMessage, getProfile } from '@/lib/line-client';
import { getState, setState, createUser } from '@/lib/conversation-state';
import { saveMessage, updateUserLineUserId, updatePausedUntil, updateUserStatus } from '@/lib/queries';
import {
  getQuestion,
  getQuestionCount,
  calculateScores,
  determineBand,
  determineWeakAxis,
  getQuestionAsync,
  getQuestionCountAsync,
  calculateScoresAsync,
  determineBandAsync,
} from '@/lib/diagnosis';
import { getNextStepAsync, findStepByIdAsync } from '@/lib/step-master';
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
  checkAndFireCta,
  handleCtaInterested,
  handleCtaDeclined,
} from '@/lib/cta-service';
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
  ctaInterestedReplyMessage,
  ctaDeclineReplyMessage,
  reminderPauseConfirmMessage,
  reminderStopConfirmMessage,
  reminderResumeConfirmMessage,
} from '@/lib/line-messages';

/**
 * replyMessage送信 + outbound保存のラッパー（fire-and-forget で保存）
 */
async function replyAndSave(
  userId: string,
  replyToken: string,
  messages: LineMessage[]
): Promise<void> {
  await replyMessage(replyToken, messages);
  for (const msg of messages) {
    try {
      const content = msg.type === 'text' ? msg.text : JSON.stringify(msg);
      await saveMessage({
        userId,
        lineUserId: userId,
        direction: 'outbound',
        content,
        messageType: 'text',
      });
    } catch (err) {
      console.error('[Webhook] outboundメッセージ保存エラー（処理は続行）:', err);
    }
  }
}

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

    const userId = lineUserId;

    await saveMessage({
      userId,
      lineUserId,
      direction: 'inbound',
      content: event.message.text,
      messageType: 'text',
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

    // usersテーブルにline_user_idを紐付け（エラーは吸収して処理を続行）
    try {
      await updateUserLineUserId(userId, userId);
    } catch (linkErr) {
      console.error('[Webhook] handleFollow line_user_id紐付けエラー（処理は続行）:', linkErr);
    }

    // Welcome + 同意確認
    const msg = welcomeMessage(conversation.preferredName);
    await replyAndSave(userId, event.replyToken, [msg]);

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
        await replyAndSave(userId, event.replyToken, [consentMessage()]);
        await setState(userId, { state: { phase: 'consent_pending' } });
        return;
      }

      await replyAndSave(userId, event.replyToken, [fallbackMessage()]);
      return;
    }

    // 「診断」キーワードで再診断開始（どのフェーズからでも）
    if (text === '診断') {
      await replyAndSave(userId, event.replyToken, [consentMessage()]);
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
          await replyAndSave(userId, event.replyToken, [laterMessage()]);
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
        const currentStep = await findStepById(state.currentStepId);
        const stepName = currentStep ? currentStep.name : '現在のステップ';
        await replyAndSave(userId, event.replyToken, [stepActiveGuideMessage(stepName)]);
        break;
      }

      case 'step_ready': {
        // ステップ待機中のテキスト入力
        if (text === 'ステップ') {
          // 次のステップを配信
          const state = conversation.state;
          if (state.phase !== 'step_ready') break;
          await deliverNextStep(userId, event.replyToken, state.weakAxis, state.completedStepIds, state.stumbleCount, state.stumbleHowCount);
          return;
        }

        await replyAndSave(userId, event.replyToken, [fallbackMessage()]);
        break;
      }

      default:
        await replyAndSave(userId, event.replyToken, [fallbackMessage()]);
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
      case 'cta_response':
        await handleCtaResponse(userId, event.replyToken, params);
        break;
      case 'reminder_resume':
        await handleReminderResume(userId, event.replyToken);
        break;
      case 'reminder_pause':
        await handleReminderPause(userId, event.replyToken);
        break;
      case 'reminder_stop':
        await handleReminderStop(userId, event.replyToken);
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
    await replyAndSave(userId, replyToken, [laterMessage()]);
    await setState(userId, { state: { phase: 'idle' } });
  }
}

/**
 * 業種選択フェーズへ遷移
 */
async function startIndustrySelect(userId: string, replyToken: string): Promise<void> {
  await replyAndSave(userId, replyToken, [industrySelectMessage()]);
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
  const q2 = await getQuestionAsync(1);
  if (!q2) return;

  const questionMsg = diagnosisQuestionMessage(q2);
  await replyAndSave(userId, replyToken, [confirmMsg, questionMsg]);
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
  const questionCount = await getQuestionCountAsync();
  if (nextIndex < questionCount) {
    const nextQ = await getQuestionAsync(nextIndex);
    if (!nextQ) return;

    await setState(userId, {
      state: {
        phase: 'diagnosis',
        questionIndex: nextIndex,
        scores: updatedScores,
      },
    });

    await replyAndSave(userId, replyToken, [diagnosisQuestionMessage(nextQ)]);
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

  const scores = await calculateScoresAsync(answers);
  const total = scores.a1 + scores.a2 + scores.b + scores.c + scores.d;
  const band = await determineBandAsync(total);
  const weakAxis = determineWeakAxis(scores);

  // 弱軸の最初のステップ名を取得
  const firstStep = await getNextStepAsync([], weakAxis);
  const firstStepName = firstStep ? firstStep.name : 'DX基礎チェック';

  // 結果メッセージ送信
  const resultMsg = diagnosisResultMessage(scores, band, weakAxis, industry);
  const stepMsg = stepStartMessage(firstStepName);

  await replyAndSave(userId, replyToken, [resultMsg, stepMsg]);

  // step_readyフェーズへ（スタートボタン待ち）
  await setState(userId, {
    state: {
      phase: 'step_ready',
      weakAxis,
      completedStepIds: [],
      stumbleCount: 0,
      stumbleHowCount: 0,
    },
  });

  // 診断完了時にCTAチェック（エラーがあってもステップ配信を止めない）
  try {
    await checkAndFireCta(userId);
  } catch (ctaErr) {
    console.error('[Webhook] 診断完了後CTA チェックエラー（処理は続行）:', ctaErr);
  }
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
  const stumbleHowCount = state.stumbleHowCount;

  await deliverNextStep(userId, replyToken, weakAxis, completedStepIds, stumbleCount, stumbleHowCount);
}

/**
 * 次のステップを配信する共通関数
 */
async function deliverNextStep(
  userId: string,
  replyToken: string,
  weakAxis: keyof AxisScores,
  completedStepIds: string[],
  stumbleCount: number,
  stumbleHowCount: number
): Promise<void> {
  const nextStep = await getNextStepAsync(completedStepIds, weakAxis);

  if (!nextStep) {
    // 全ステップ完了
    const level = calculateLevel(completedStepIds.length);
    await replyAndSave(userId, replyToken, [allStepsCompleteMessage(completedStepIds.length, level)]);
    await setState(userId, {
      state: {
        phase: 'step_ready',
        weakAxis,
        completedStepIds,
        stumbleCount,
        stumbleHowCount,
      },
    });
    return;
  }

  // ステップ内容を配信
  const contentMsg = stepContentMessage(nextStep, completedStepIds.length);
  await replyAndSave(userId, replyToken, [contentMsg]);

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
      stumbleHowCount,
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

  const completedStep = await findStepById(stepId);
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

  // completedStepIds全体からスコアを累積計算
  let totalScore = 0;
  for (const id of newCompletedIds) {
    const s = await findStepById(id);
    totalScore += s ? calculateScoreForStep(s.difficulty) : 0;
  }

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
    score: totalScore,
  });

  // 次のステップがあるか確認
  const nextStep = await getNextStepAsync(newCompletedIds, state.weakAxis);

  if (!nextStep) {
    // 全ステップ完了
    await replyAndSave(userId, replyToken, [allStepsCompleteMessage(newCompletedCount, newLevel)]);
    await setState(userId, {
      state: {
        phase: 'step_ready',
        weakAxis: state.weakAxis,
        completedStepIds: newCompletedIds,
        stumbleCount: state.stumbleCount,
        stumbleHowCount: state.stumbleHowCount,
      },
    });
    return;
  }

  // 完了祝福メッセージ
  const completeMsg = stepCompleteMessage(completedStep, newCompletedCount, levelUp, newLevel);
  await replyAndSave(userId, replyToken, [completeMsg]);

  // 状態をstep_readyに更新（次ステップ待ち）
  await setState(userId, {
    state: {
      phase: 'step_ready',
      weakAxis: state.weakAxis,
      completedStepIds: newCompletedIds,
      stumbleCount: state.stumbleCount,
      stumbleHowCount: state.stumbleHowCount,
    },
  });

  // CTA発火チェック（エラーがあってもステップ配信を止めない）
  try {
    await checkAndFireCta(userId);
  } catch (ctaErr) {
    console.error('[Webhook] ステップ完了後CTA チェックエラー（処理は続行）:', ctaErr);
  }
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

  const step = await findStepById(stepId);
  if (!step) {
    console.error('[Webhook] step_stumble: ステップ定義なし:', stepId);
    return;
  }

  const newStumbleCount = state.stumbleCount + 1;
  const newStumbleHowCount = stumbleTypeRaw === 'how'
    ? state.stumbleHowCount + 1
    : state.stumbleHowCount;

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
    counterUpdate.stumbleHowCount = newStumbleHowCount;
  }
  await updateUserStepCounters(userId, counterUpdate);

  // ヒントメッセージ送信
  const hintMsg = stepStumbleMessage(step, stumbleTypeRaw);
  await replyAndSave(userId, replyToken, [hintMsg]);

  // 状態は step_active のまま（同じステップに再挑戦可能）
  await setState(userId, {
    state: {
      ...state,
      stumbleCount: newStumbleCount,
      stumbleHowCount: newStumbleHowCount,
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
  const step = await findStepById(stepId);

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
  await deliverNextStep(userId, replyToken, state.weakAxis, newCompletedIds, state.stumbleCount, state.stumbleHowCount);
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

  await replyAndSave(userId, replyToken, [stepPauseMessage()]);

  // step_readyに戻す（再開時にstep_startで続きから）
  await setState(userId, {
    state: {
      phase: 'step_ready',
      weakAxis: state.weakAxis,
      completedStepIds: state.completedStepIds,
      stumbleCount: state.stumbleCount,
      stumbleHowCount: state.stumbleHowCount,
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
  const step = await findStepById(stepId);
  if (!step) {
    await replyAndSave(userId, replyToken, [fallbackMessage()]);
    return;
  }

  const contentMsg = stepContentMessage(step, completedStepIds.length);
  await replyAndSave(userId, replyToken, [contentMsg]);
}

/**
 * stepIdからStepDefinitionを検索（DB優先の非同期版）
 */
async function findStepById(stepId: string): Promise<StepDefinition | null> {
  return findStepByIdAsync(stepId);
}

// ===== CTA応答ハンドラ =====

/**
 * CTA応答処理（「詳しく聞く」「今はいい」）
 */
async function handleCtaResponse(
  userId: string,
  replyToken: string,
  params: Map<string, string>
): Promise<void> {
  const ctaId = params.get('ctaId') ?? '';
  const value = params.get('value') ?? '';

  if (!ctaId) {
    console.warn('[Webhook] cta_response: ctaId なし');
    return;
  }

  if (value === 'interested') {
    // 「詳しく聞く」
    await handleCtaInterested(userId, ctaId);
    await replyAndSave(userId, replyToken, [ctaInterestedReplyMessage()]);
  } else if (value === 'decline') {
    // 「今はいい」
    await handleCtaDeclined(userId, ctaId);
    await replyAndSave(userId, replyToken, [ctaDeclineReplyMessage()]);
  } else {
    console.warn('[Webhook] cta_response: 不明なvalue:', value);
  }
}

// ===== リマインダー応答ハンドラ =====

/**
 * リマインダー「再開する」処理
 * paused_untilをクリアし、最新ステップを案内
 */
async function handleReminderResume(
  userId: string,
  replyToken: string
): Promise<void> {
  try {
    // paused_until をクリア
    await updatePausedUntil(userId, null);

    // 現在の会話状態から最新ステップ名を取得
    const conversation = await getState(userId);
    let stepName: string | null = null;

    if (conversation) {
      const { state } = conversation;
      if (state.phase === 'step_active') {
        const step = await findStepById(state.currentStepId);
        stepName = step?.name ?? null;
      } else if (state.phase === 'step_ready') {
        const nextStep = await getNextStepAsync(state.completedStepIds, state.weakAxis);
        stepName = nextStep?.name ?? null;
      }
    }

    await replyAndSave(userId, replyToken, [reminderResumeConfirmMessage(stepName)]);
  } catch (error) {
    console.error('[Webhook] handleReminderResume エラー:', error);
  }
}

/**
 * リマインダー「一時停止」処理
 * paused_untilを7日後に設定
 */
async function handleReminderPause(
  userId: string,
  replyToken: string
): Promise<void> {
  try {
    const pauseUntil = new Date();
    pauseUntil.setDate(pauseUntil.getDate() + 7);

    await updatePausedUntil(userId, pauseUntil.toISOString());
    await replyAndSave(userId, replyToken, [reminderPauseConfirmMessage()]);
  } catch (error) {
    console.error('[Webhook] handleReminderPause エラー:', error);
  }
}

/**
 * リマインダー「配信停止」処理
 * customer_status を churned に変更
 */
async function handleReminderStop(
  userId: string,
  replyToken: string
): Promise<void> {
  try {
    await updateUserStatus(userId, 'churned');
    await replyAndSave(userId, replyToken, [reminderStopConfirmMessage()]);
  } catch (error) {
    console.error('[Webhook] handleReminderStop エラー:', error);
  }
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
