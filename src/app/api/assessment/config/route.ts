// ===== GET /api/assessment/config =====
// 公開エンドポイント（認証不要）
// アセスメントフォームが必要とする公開設定のみを返す

import { NextResponse } from 'next/server';
import { getAppSetting } from '@/lib/queries';
import { PRECISION_QUESTIONS } from '@/lib/precision-interview';
import type { PrecisionQuestion } from '@/lib/precision-interview';
import type { AssessmentStyle } from '@/lib/types';
import { DEFAULT_ASSESSMENT_STYLE } from '@/lib/types';

interface EncryptedLineConfig {
  botBasicId?: string | null;
  botName?: string | null;
  verified?: boolean;
}

interface AssessmentConfigResponse {
  lineUrl: string | null;
  questions: PrecisionQuestion[];
  style: AssessmentStyle;
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

    // 外観設定の取得
    const savedStyle = await getAppSetting<AssessmentStyle>('assessment_style');
    const style: AssessmentStyle =
      savedStyle !== null && typeof savedStyle === 'object' && !Array.isArray(savedStyle)
        ? { ...DEFAULT_ASSESSMENT_STYLE, ...savedStyle }
        : DEFAULT_ASSESSMENT_STYLE;

    return NextResponse.json({
      lineUrl: buildFriendUrl(botBasicId),
      questions,
      style,
    });
  } catch (err) {
    console.error('[Assessment Config] エラー:', err);
    return NextResponse.json({
      lineUrl: null,
      questions: PRECISION_QUESTIONS,
      style: DEFAULT_ASSESSMENT_STYLE,
    });
  }
}
