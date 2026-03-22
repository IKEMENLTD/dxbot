// ===== LINE Webhook API Route =====

import { NextRequest, NextResponse } from 'next/server';
import type { WebhookBody, WebhookEvent, FollowEvent, TextMessageEvent, PostbackEvent } from '@/lib/line-types';
import type { AxisScores } from '@/lib/types';
import { verifySignature, replyMessage, getProfile } from '@/lib/line-client';
import { getState, setState, createUser } from '@/lib/conversation-state';
import {
  getQuestion,
  getQuestionCount,
  calculateScores,
  determineBand,
  determineWeakAxis,
} from '@/lib/diagnosis';
import {
  welcomeMessage,
  consentMessage,
  industrySelectMessage,
  industryConfirmMessage,
  diagnosisQuestionMessage,
  diagnosisResultMessage,
  stepStartMessage,
  laterMessage,
  fallbackMessage,
} from '@/lib/line-messages';

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
        await handleTextMessage(event);
      }
      break;
    case 'postback':
      await handlePostback(event);
      break;
    case 'unfollow':
      // ブロック時は何もしない
      break;
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

    // 「診断」キーワードで再開
    if (text === '診断') {
      await replyMessage(event.replyToken, [consentMessage()]);
      await setState(userId, { state: { phase: 'consent_pending' } });
      return;
    }

    // フェーズに応じた処理
    switch (conversation.state.phase) {
      case 'consent_pending':
        // テキストで「はい」的な入力
        if (text === 'はい' || text === 'はい、始めます') {
          await startIndustrySelect(userId, event.replyToken);
        } else {
          await replyMessage(event.replyToken, [laterMessage()]);
          await setState(userId, { state: { phase: 'idle' } });
        }
        break;

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
        // ステップ開始（将来拡張用）
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
 * 診断完了 → 結果表示
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

  // 状態更新
  await setState(userId, {
    state: { phase: 'diagnosis_complete', scores },
  });

  // 結果メッセージ送信
  const resultMsg = diagnosisResultMessage(scores, band, weakAxis, industry);
  const stepMsg = stepStartMessage('DX基礎チェック');

  await replyMessage(replyToken, [resultMsg, stepMsg]);

  // ステップフェーズへ
  await setState(userId, {
    state: { phase: 'step_active', currentStep: 1 },
  });
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
