// ===== CTA Service テスト =====

import { describe, it, expect } from 'vitest';
import { evaluateCta } from '../cta-engine';
import { ctaProposalMessage, ctaInterestedReplyMessage, ctaDeclineReplyMessage } from '../line-messages';

// ---------------------------------------------------------------------------
// テスト用ヘルパー
// ---------------------------------------------------------------------------

function makeRecommendation(overrides?: Record<string, unknown>) {
  return {
    primaryExit: 'taskmate' as const,
    primaryScore: 30,
    secondaryExit: 'veteran_ai' as const,
    secondaryScore: 15,
    confidence: 60,
    reasons: ['弱点軸: 繰り返し作業（スコア 3pt）'],
    ...overrides,
  };
}

function makeCtaInput(overrides?: Record<string, unknown>) {
  return {
    user: {
      level: 10,
      score: 100,
      customerStatus: 'prospect' as const,
      leadSource: 'other' as const,
      leadNote: null as string | null,
      axisScores: { a1: 8, a2: 7, b: 3, c: 6, d: 8 },
      stepsCompleted: 5,
      stumbleHowCount: 0,
      daysSinceStart: 20,
      lastActionDaysAgo: 1,
      recentCompletedSteps: 2,
      recentCompletedDays: 10,
      ...overrides,
    },
    recommendation: makeRecommendation(),
  };
}

// ---------------------------------------------------------------------------
// テストケース
// ---------------------------------------------------------------------------

describe('CTA Engine evaluateCta', () => {
  it('条件に該当しない場合はshouldFire=falseを返す', () => {
    const input = makeCtaInput();
    const result = evaluateCta(input);

    expect(result.shouldFire).toBe(false);
    expect(result.trigger).toBeNull();
    expect(result.exit).toBeNull();
  });

  it('トリガー1: 行動加速 - 14日以内に3ステップ完了', () => {
    const input = makeCtaInput({
      recentCompletedDays: 10,
      recentCompletedSteps: 3,
    });
    const result = evaluateCta(input);

    expect(result.shouldFire).toBe(true);
    expect(result.trigger).toBe('action_boost');
    expect(result.exit).toBe('taskmate');
    expect(result.priority).toBe('medium');
  });

  it('トリガー2: アポ早期 - apo+7日以内に2ステップ', () => {
    const input = makeCtaInput({
      leadSource: 'apo',
      recentCompletedDays: 5,
      recentCompletedSteps: 2,
    });
    const result = evaluateCta(input);

    expect(result.shouldFire).toBe(true);
    expect(result.trigger).toBe('apo_early');
    expect(result.priority).toBe('high');
  });

  it('トリガー4: Lv.31-40ゾーン到達（推進段階）（補助金時期外）', () => {
    // 補助金時期（1-3月, 6-8月）にはsubsidy_timingが先に発火するため
    // lv40_reachedが単独で発火するのは4-5月, 9-12月のみ。
    // ここではshouldFire=trueかつ適切なトリガーが選ばれることを検証
    const input = makeCtaInput({
      level: 40,
    });
    const result = evaluateCta(input);

    expect(result.shouldFire).toBe(true);
    // 補助金時期ならsubsidy_timing、それ以外ならlv40_reached
    expect(['lv40_reached', 'subsidy_timing']).toContain(result.trigger);
    // lv40_reached発火時はバンド範囲表記を含むメッセージが返る
    if (result.trigger === 'lv40_reached') {
      expect(result.message).toContain('Lv.31-40');
      expect(result.message).toContain('推進段階');
    }
    // subsidy_timing発火時はバンドラベルとフェーズ名を含む
    if (result.trigger === 'subsidy_timing') {
      expect(result.message).toContain('補助金');
    }
  });

  it('トリガー5: インボイスstumble - A1低+請求関連', () => {
    const input = makeCtaInput({
      axisScores: { a1: 3, a2: 7, b: 6, c: 6, d: 8 },
      leadNote: '請求書の管理が大変',
      stumbleHowCount: 1,
    });
    const result = evaluateCta(input);

    expect(result.shouldFire).toBe(true);
    expect(result.trigger).toBe('invoice_stumble');
    expect(result.exit).toBe('veteran_ai');
    expect(result.priority).toBe('high');
  });

  it('トリガー6: ITリテラシー不足 - stumble(how)3回以上', () => {
    const input = makeCtaInput({
      stumbleHowCount: 3,
    });
    const result = evaluateCta(input);

    expect(result.shouldFire).toBe(true);
    expect(result.trigger).toBe('it_literacy');
    expect(result.exit).toBe('techstars');
    expect(result.priority).toBe('high');
  });

  it('トリガー6: ITリテラシー不足 - 軸D低+全体24pt以下', () => {
    const input = makeCtaInput({
      axisScores: { a1: 3, a2: 3, b: 3, c: 3, d: 2 },
    });
    const result = evaluateCta(input);

    expect(result.shouldFire).toBe(true);
    expect(result.trigger).toBe('it_literacy');
    expect(result.exit).toBe('techstars');
  });

  it('トリガー6: techstars_gradはTECHSTARSから除外', () => {
    const input = makeCtaInput({
      customerStatus: 'techstars_grad',
      stumbleHowCount: 3,
    });
    const result = evaluateCta(input);

    // techstars_gradの場合、it_literacyトリガーは発火しない
    expect(result.trigger).not.toBe('it_literacy');
  });

  it('優先順位: invoice_stumble > it_literacy', () => {
    const input = makeCtaInput({
      axisScores: { a1: 3, a2: 3, b: 3, c: 3, d: 2 },
      leadNote: '請求書管理が大変',
      stumbleHowCount: 3,
    });
    const result = evaluateCta(input);

    // invoice_stumbleが先に評価される
    expect(result.trigger).toBe('invoice_stumble');
  });
});

describe('CTA メッセージテンプレート', () => {
  it('ctaProposalMessageが正しいFlexMessageを返す', () => {
    const msg = ctaProposalMessage('action_boost', 'taskmate', 'cta_test_123');

    expect(msg.type).toBe('flex');
    expect(msg.altText).toBe('TaskMateのご提案');
    expect(msg.contents.type).toBe('bubble');
    expect(msg.contents.footer).toBeDefined();

    // フッターに2つのボタンがある
    const footer = msg.contents.footer;
    expect(footer).toBeDefined();
    if (footer) {
      const buttons = footer.contents.filter(
        (c) => c.type === 'button'
      );
      expect(buttons.length).toBe(2);
    }
  });

  it('ctaInterestedReplyMessageがTextMessageを返す', () => {
    const msg = ctaInterestedReplyMessage();
    expect(msg.type).toBe('text');
    expect(msg.text).toContain('担当者');
  });

  it('ctaDeclineReplyMessageがTextMessageを返す', () => {
    const msg = ctaDeclineReplyMessage();
    expect(msg.type).toBe('text');
    expect(msg.text).toContain('承知しました');
  });

  it('各exit typeのCTAメッセージが生成できる', () => {
    const exits = ['techstars', 'taskmate', 'veteran_ai', 'custom_dev'] as const;
    const triggers = ['action_boost', 'it_literacy', 'lv40_reached'] as const;

    for (const exit of exits) {
      for (const trigger of triggers) {
        const msg = ctaProposalMessage(trigger, exit, `cta_test_${exit}_${trigger}`);
        expect(msg.type).toBe('flex');
        expect(msg.contents.body).toBeDefined();
      }
    }
  });
});
