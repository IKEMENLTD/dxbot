// ===== GET /api/assessment/config =====
// 公開エンドポイント（認証不要）
// アセスメントフォームが必要とする公開設定のみを返す

import { NextResponse } from 'next/server';
import { getAppSetting } from '@/lib/queries';
import { PRECISION_QUESTIONS } from '@/lib/precision-interview';
import type { PrecisionQuestion } from '@/lib/precision-interview';

interface EncryptedLineConfig {
  botBasicId?: string | null;
  botName?: string | null;
  verified?: boolean;
}

interface AssessmentConfigResponse {
  lineUrl: string | null;
  questions: PrecisionQuestion[];
}

function buildFriendUrl(botBasicId: string | null | undefined): string | null {
  if (!botBasicId) return null;
  const normalizedId = botBasicId.startsWith('@') ? botBasicId : `@${botBasicId}`;
  return `https://line.me/R/ti/p/${normalizedId}`;
}

export async function GET(): Promise<NextResponse<AssessmentConfigResponse>> {
  try {
    // LINE設定の取得
    const config = await getAppSetting<EncryptedLineConfig>('line_config');

    const botBasicId =
      config !== null &&
      typeof config === 'object' &&
      !Array.isArray(config) &&
      config.verified
        ? config.botBasicId
        : null;

    // カスタム精密ヒアリング設問の取得
    const customQuestions = await getAppSetting<PrecisionQuestion[]>('precision_questions');
    const questions: PrecisionQuestion[] =
      Array.isArray(customQuestions) && customQuestions.length > 0
        ? customQuestions
        : PRECISION_QUESTIONS;

    return NextResponse.json({
      lineUrl: buildFriendUrl(botBasicId),
      questions,
    });
  } catch (err) {
    console.error('[Assessment Config] エラー:', err);
    return NextResponse.json({
      lineUrl: null,
      questions: PRECISION_QUESTIONS,
    });
  }
}
