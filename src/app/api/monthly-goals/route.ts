// GET/PUT /api/monthly-goals - 月間目標の取得・更新

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getSupabaseServer } from '@/lib/supabase';

interface MonthlyGoalRow {
  year_month: string;
  target_converted: number;
  target_revenue: number;
}

interface MonthlyGoalResponse {
  month: string;
  targetConverted: number;
  targetRevenue: number;
}

const DEFAULT_GOAL: MonthlyGoalResponse = {
  month: '',
  targetConverted: 3,
  targetRevenue: 5000000,
};

function getCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month') || getCurrentMonth();

  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({
        data: { ...DEFAULT_GOAL, month },
      });
    }

    const { data, error } = await supabase
      .from('monthly_goals')
      .select('year_month, target_converted, target_revenue')
      .eq('year_month', month)
      .single();

    if (error) {
      // PGRST116 = row not found (normal)
      // 42P01 = table does not exist
      if (error.code === 'PGRST116' || error.code === '42P01') {
        return NextResponse.json({
          data: { ...DEFAULT_GOAL, month },
        });
      }
      console.error('[API /monthly-goals GET] Supabase error:', error.message);
      return NextResponse.json({
        data: { ...DEFAULT_GOAL, month },
      });
    }

    const row = data as MonthlyGoalRow;
    const result: MonthlyGoalResponse = {
      month: row.year_month,
      targetConverted: row.target_converted,
      targetRevenue: row.target_revenue,
    };

    return NextResponse.json({ data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '月間目標の取得に失敗しました';
    console.error('[API /monthly-goals GET]', message);
    return NextResponse.json({
      data: { ...DEFAULT_GOAL, month },
    });
  }
}

interface PutBody {
  month: string;
  targetConverted: number;
  targetRevenue: number;
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const body = (await request.json()) as PutBody;

    if (!body.month || typeof body.targetConverted !== 'number' || typeof body.targetRevenue !== 'number') {
      return NextResponse.json(
        { error: 'month, targetConverted, targetRevenue は必須です' },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}$/.test(body.month)) {
      return NextResponse.json(
        { error: 'month は YYYY-MM 形式で指定してください' },
        { status: 400 }
      );
    }

    if (body.targetConverted < 0 || body.targetRevenue < 0) {
      return NextResponse.json(
        { error: '目標値は0以上で指定してください' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json(
        { error: 'データベース未接続です' },
        { status: 500 }
      );
    }

    const { error } = await supabase
      .from('monthly_goals')
      .upsert(
        {
          year_month: body.month,
          target_converted: body.targetConverted,
          target_revenue: body.targetRevenue,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'year_month' }
      );

    if (error) {
      console.error('[API /monthly-goals PUT] Supabase error:', error.message);
      return NextResponse.json(
        { error: '月間目標の保存に失敗しました' },
        { status: 500 }
      );
    }

    const result: MonthlyGoalResponse = {
      month: body.month,
      targetConverted: body.targetConverted,
      targetRevenue: body.targetRevenue,
    };

    return NextResponse.json({ data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '月間目標の保存に失敗しました';
    console.error('[API /monthly-goals PUT]', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
