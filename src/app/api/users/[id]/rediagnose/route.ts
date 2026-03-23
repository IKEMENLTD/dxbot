// POST /api/users/[id]/rediagnose - 再診断トリガー
// 1. LINE pushMessage で再診断開始メッセージを送信
// 2. conversation_states のフェーズを consent_pending にリセット

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getLineUserIdByUserId, resetConversationForRediagnosis } from '@/lib/queries';
import { pushMessage } from '@/lib/line-client';
import type { TextMessage } from '@/lib/line-types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const REDIAGNOSE_MESSAGE = [
  'DXBOTからのお知らせです。',
  '',
  '前回の診断から時間が経ちました。',
  '再度DX診断を受けてみませんか？',
  '',
  '最新の業務状況に合わせた改善提案をお届けします。',
  '',
  '「診断を開始する」と入力してください。',
].join('\n');

export async function POST(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { id } = await context.params;

    // LINE User ID を取得
    const lineUserId = await getLineUserIdByUserId(id);

    if (!lineUserId) {
      return NextResponse.json(
        { error: 'このユーザーのLINE IDが見つかりません。LINE連携が完了していない可能性があります。' },
        { status: 404 }
      );
    }

    // LINE pushMessage で再診断メッセージ送信
    const lineMsg: TextMessage = { type: 'text', text: REDIAGNOSE_MESSAGE };
    const pushResult = await pushMessage(lineUserId, [lineMsg]);

    if (!pushResult.success) {
      const statusCode = pushResult.statusCode === 429 ? 429 : 502;
      return NextResponse.json(
        { error: `LINE送信に失敗しました: ${pushResult.error ?? '不明なエラー'}` },
        { status: statusCode }
      );
    }

    // conversation_state を consent_pending にリセット
    const resetResult = await resetConversationForRediagnosis(lineUserId);

    if (!resetResult.success) {
      // LINE送信は成功したが、状態リセットが失敗
      console.error('[rediagnose] 会話状態リセット失敗:', resetResult.error);
      // LINEは送れたので成功扱い（警告付き）
      return NextResponse.json({
        data: {
          userId: id,
          lineSent: true,
          lineMock: pushResult.mock,
          stateReset: false,
          warning: '再診断メッセージは送信しましたが、会話状態のリセットに失敗しました。',
        },
      });
    }

    return NextResponse.json({
      data: {
        userId: id,
        lineSent: true,
        lineMock: pushResult.mock,
        stateReset: true,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '再診断送信に失敗しました';
    console.error('[API /users/[id]/rediagnose POST]', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
