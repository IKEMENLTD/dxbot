// ===== step-master ユニットテスト =====

import { describe, it, expect } from 'vitest';
import { getStepsForAxis, getNextStep, getAllSteps } from '../step-master';

describe('getAllSteps', () => {
  it('30ステップある', () => {
    expect(getAllSteps()).toHaveLength(30);
  });

  it('全ステップにユニークIDがある', () => {
    const steps = getAllSteps();
    const ids = steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(30);
  });
});

describe('getStepsForAxis', () => {
  it('a1軸は6ステップ', () => {
    expect(getStepsForAxis('a1')).toHaveLength(6);
  });

  it('b軸は6ステップ', () => {
    expect(getStepsForAxis('b')).toHaveLength(6);
  });

  it('各ステップのaxisが一致する', () => {
    const steps = getStepsForAxis('c');
    for (const step of steps) {
      expect(step.axis).toBe('c');
    }
  });
});

describe('getNextStep', () => {
  it('空の完了リストなら弱点軸の最初のステップを返す', () => {
    const step = getNextStep([], 'a1');
    expect(step).not.toBeNull();
    expect(step?.id).toBe('S01');
  });

  it('弱点軸の最初のステップが完了済なら次を返す', () => {
    const step = getNextStep(['S01'], 'a1');
    expect(step?.id).toBe('S02');
  });

  it('弱点軸が全完了なら他の軸から返す', () => {
    const completedA1 = ['S01', 'S02', 'S03', 'S04', 'S05', 'S06'];
    const step = getNextStep(completedA1, 'a1');
    expect(step).not.toBeNull();
    expect(step?.axis).not.toBe('a1');
  });

  it('全30ステップ完了ならnullを返す', () => {
    const allIds = getAllSteps().map((s) => s.id);
    const step = getNextStep(allIds, 'a1');
    expect(step).toBeNull();
  });

  it('d軸のステップもweakAxisで正しく返す', () => {
    const step = getNextStep([], 'd');
    expect(step?.id).toBe('S25');
    expect(step?.axis).toBe('d');
  });
});
