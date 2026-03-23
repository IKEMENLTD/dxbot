// ===== リマインダーロジック テスト =====
// route.ts 内の純粋関数をテスト（インポートできないためロジックを再現）

import { describe, it, expect } from 'vitest';

/** 放置日数を計算する関数（route.ts と同一ロジック） */
function calculateInactiveDays(lastActionAt: string): number {
  const lastAction = new Date(lastActionAt);
  const now = new Date();
  const diffMs = now.getTime() - lastAction.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

type ReminderLevel = 'light' | 'medium' | 'final';

/** リマインダーレベル判定（route.ts と同一ロジック） */
function determineReminderLevel(inactiveDays: number): ReminderLevel | null {
  if (inactiveDays >= 21) return null;
  if (inactiveDays >= 14) return 'final';
  if (inactiveDays >= 7) return 'medium';
  if (inactiveDays >= 3) return 'light';
  return null;
}

describe('calculateInactiveDays', () => {
  it('3日前のlast_action_atで3を返す', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const days = calculateInactiveDays(threeDaysAgo.toISOString());
    expect(days).toBe(3);
  });

  it('今日のlast_action_atで0を返す', () => {
    const now = new Date();
    const days = calculateInactiveDays(now.toISOString());
    expect(days).toBe(0);
  });

  it('30日前のlast_action_atで30を返す', () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const days = calculateInactiveDays(thirtyDaysAgo.toISOString());
    expect(days).toBe(30);
  });
});

describe('determineReminderLevel', () => {
  it('0日: null（リマインダーなし）', () => {
    expect(determineReminderLevel(0)).toBeNull();
  });

  it('1日: null（リマインダーなし）', () => {
    expect(determineReminderLevel(1)).toBeNull();
  });

  it('2日: null（リマインダーなし）', () => {
    expect(determineReminderLevel(2)).toBeNull();
  });

  it('3日: light', () => {
    expect(determineReminderLevel(3)).toBe('light');
  });

  it('5日: light', () => {
    expect(determineReminderLevel(5)).toBe('light');
  });

  it('6日: light', () => {
    expect(determineReminderLevel(6)).toBe('light');
  });

  it('7日: medium', () => {
    expect(determineReminderLevel(7)).toBe('medium');
  });

  it('10日: medium', () => {
    expect(determineReminderLevel(10)).toBe('medium');
  });

  it('13日: medium', () => {
    expect(determineReminderLevel(13)).toBe('medium');
  });

  it('14日: final', () => {
    expect(determineReminderLevel(14)).toBe('final');
  });

  it('17日: final', () => {
    expect(determineReminderLevel(17)).toBe('final');
  });

  it('20日: final', () => {
    expect(determineReminderLevel(20)).toBe('final');
  });

  it('21日: null（リマインダー停止）', () => {
    expect(determineReminderLevel(21)).toBeNull();
  });

  it('30日: null（リマインダー停止）', () => {
    expect(determineReminderLevel(30)).toBeNull();
  });
});
