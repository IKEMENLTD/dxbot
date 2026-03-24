// GET /api/users/[id]/sales-email - 営業武器メール生成

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getUserById, getStumblesByUserId } from '@/lib/queries';
import { calculateRecommendation } from '@/lib/recommend-engine';
import { generateSalesEmail } from '@/lib/sales-email';
import type { AxisScores, StumbleType } from '@/lib/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const user = await getUserById(id);

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    const stumbles = await getStumblesByUserId(id);

    // 日数計算（Invalid Date フォールバック）
    const now = new Date();
    const parsedCreatedAt = new Date(user.created_at);
    const createdAt = Number.isNaN(parsedCreatedAt.getTime()) ? now : parsedCreatedAt;
    const daysSinceStart = Math.max(1, Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));

    const parsedLastActionAt = new Date(user.last_action_at);
    const lastActionAt = Number.isNaN(parsedLastActionAt.getTime()) ? now : parsedLastActionAt;
    const lastActionDaysAgo = Math.max(0, Math.floor((now.getTime() - lastActionAt.getTime()) / (1000 * 60 * 60 * 24)));

    // weakAxisを型安全に変換
    const validAxes: (keyof AxisScores)[] = ['a1', 'a2', 'b', 'c', 'd'];
    const weakAxis: keyof AxisScores = validAxes.includes(user.weak_axis as keyof AxisScores)
      ? (user.weak_axis as keyof AxisScores)
      : 'a1';

    // recentStumblesの変換
    const recentStumbles = stumbles.map((s) => ({
      stepId: s.step_id,
      type: s.stumble_type as StumbleType,
    }));

    // レコメンド計算
    const recommendation = calculateRecommendation({
      axisScores: user.axis_scores,
      weakAxis,
      industry: user.industry ?? null,
      customerStatus: user.customer_status,
      leadSource: user.lead_source,
      leadNote: user.lead_note,
      stepsCompleted: user.steps_completed,
      stumbleCount: user.stumble_count,
      stumbleHowCount: user.stumble_how_count,
      recentStumbles,
      daysSinceStart,
      recentStepDays: Math.min(daysSinceStart, 14),
      hasActiveOperation: lastActionDaysAgo <= 3,
    });

    // メール生成
    const email = generateSalesEmail({
      userName: user.preferred_name,
      companyName: user.company_name,
      industry: user.industry,
      recommendation,
      axisScores: user.axis_scores,
      level: user.level,
      leadNote: user.lead_note,
    });

    return NextResponse.json({
      data: {
        email,
        recommendation,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '営業メール生成に失敗しました';
    console.error('[API /users/[id]/sales-email GET]', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
