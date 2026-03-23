// ===== step-delivery ユニットテスト =====

import { describe, it, expect } from 'vitest';
import { calculateLevel, calculateScoreForStep } from '../step-delivery';

describe('calculateLevel', () => {
  it('0ステップ完了ならLv.0', () => {
    expect(calculateLevel(0)).toBe(0);
  });

  it('1ステップ完了ならLv.1', () => {
    expect(calculateLevel(1)).toBe(1);
  });

  it('2ステップ完了ならLv.3', () => {
    expect(calculateLevel(2)).toBe(3);
  });

  it('10ステップ完了ならLv.15', () => {
    expect(calculateLevel(10)).toBe(15);
  });

  it('30ステップ全完了ならLv.45', () => {
    expect(calculateLevel(30)).toBe(45);
  });
});

describe('calculateScoreForStep', () => {
  it('難易度1は10点', () => {
    expect(calculateScoreForStep(1)).toBe(10);
  });

  it('難易度2は20点', () => {
    expect(calculateScoreForStep(2)).toBe(20);
  });

  it('難易度3は30点', () => {
    expect(calculateScoreForStep(3)).toBe(30);
  });
});
