// ===== GET /api/assessment/config =====
// 公開エンドポイント（認証不要）
// アセスメントフォームが必要とする公開設定のみを返す

import { NextResponse } from 'next/server';
import { getAppSetting } from '@/lib/queries';

interface EncryptedLineConfig {
  botBasicId?: string | null;
  botName?: string | null;
  verified?: boolean;
}

interface AssessmentConfigResponse {
  lineUrl: string | null;
}

function buildFriendUrl(botBasicId: string | null | undefined): string | null {
  if (!botBasicId) return null;
  const normalizedId = botBasicId.startsWith('@') ? botBasicId : `@${botBasicId}`;
  return `https://line.me/R/ti/p/${normalizedId}`;
}

export async function GET(): Promise<NextResponse<AssessmentConfigResponse>> {
  try {
    const config = await getAppSetting<EncryptedLineConfig>('line_config');

    const botBasicId =
      config !== null &&
      typeof config === 'object' &&
      !Array.isArray(config) &&
      config.verified
        ? config.botBasicId
        : null;

    return NextResponse.json({ lineUrl: buildFriendUrl(botBasicId) });
  } catch (err) {
    console.error('[Assessment Config] エラー:', err);
    return NextResponse.json({ lineUrl: null });
  }
}
