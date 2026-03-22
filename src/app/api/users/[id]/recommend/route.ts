// GET /api/users/[id]/recommend - ユーザーのレコメンド+CTA判定

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getUserById, getStumblesByUserId } from '@/lib/queries';
import { calculateRecommendation } from '@/lib/recommend-engine';
import { evaluateCta } from '@/lib/cta-engine';
import { getNextStep } from '@/lib/step-master';
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

    // CTA判定
    const cta = evaluateCta({
      user: {
        level: user.level,
        score: user.score,
        customerStatus: user.customer_status,
        leadSource: user.lead_source,
        leadNote: user.lead_note,
        axisScores: user.axis_scores,
        stepsCompleted: user.steps_completed,
        stumbleHowCount: user.stumble_how_count,
        daysSinceStart,
        lastActionDaysAgo,
        recentCompletedSteps: user.steps_completed,
        recentCompletedDays: Math.min(daysSinceStart, 14),
      },
      recommendation,
    });

    // 次のステップ提案
    // completedStepIdsは実際のデータがないため、steps_completedから近似
    const completedIds: string[] = [];
    for (let i = 1; i <= user.steps_completed && i <= 30; i++) {
      completedIds.push(`S${String(i).padStart(2, '0')}`);
    }
    const nextStep = getNextStep(completedIds, weakAxis);

    return NextResponse.json({
      data: {
        recommendation,
        cta,
        nextStep,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'レコメンド計算に失敗しました';
    console.error('[API /users/[id]/recommend GET]', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
