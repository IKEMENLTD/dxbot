// ===== line-messages ステップ配信メッセージ テスト =====

import { describe, it, expect } from 'vitest';
import {
  stepContentMessage,
  stepCompleteMessage,
  allStepsCompleteMessage,
  stepStumbleMessage,
  stepPauseMessage,
  stepActiveGuideMessage,
  stepStartMessage,
} from '../line-messages';
import type { StepDefinition } from '../step-master';

const MOCK_STEP: StepDefinition = {
  id: 'S01',
  name: '請求書作成',
  description: '基本的な請求書をデジタルで作成する',
  axis: 'a1',
  difficulty: 1,
  estimatedMinutes: 15,
};

const MOCK_STEP_HARD: StepDefinition = {
  id: 'S18',
  name: '自動化実行',
  description: '選定ツールで実際に自動化を設定・実行する',
  axis: 'b',
  difficulty: 3,
  estimatedMinutes: 45,
};

describe('stepStartMessage', () => {
  it('ステップ名を含む', () => {
    const msg = stepStartMessage('請求書作成');
    expect(msg.type).toBe('text');
    expect(msg.text).toContain('請求書作成');
  });

  it('スタートボタンのQuick Replyがある', () => {
    const msg = stepStartMessage('テスト');
    expect(msg.quickReply).toBeDefined();
    expect(msg.quickReply?.items).toHaveLength(1);
    expect(msg.quickReply?.items[0].action.type).toBe('postback');
  });
});

describe('stepContentMessage', () => {
  it('ステップ情報を全て含む', () => {
    const msg = stepContentMessage(MOCK_STEP, 0);
    expect(msg.text).toContain('請求書作成');
    expect(msg.text).toContain('基本的な請求書をデジタルで作成する');
    expect(msg.text).toContain('売上・請求管理');
    expect(msg.text).toContain('Lv.1');
    expect(msg.text).toContain('約15分');
  });

  it('完了/つまずきの4つのQuick Replyがある', () => {
    const msg = stepContentMessage(MOCK_STEP, 0);
    expect(msg.quickReply?.items).toHaveLength(4);
  });

  it('postbackデータにstepIdが含まれる', () => {
    const msg = stepContentMessage(MOCK_STEP, 0);
    const completeAction = msg.quickReply?.items[0].action;
    if (completeAction?.type === 'postback') {
      expect(completeAction.data).toContain('stepId=S01');
      expect(completeAction.data).toContain('action=step_complete');
    }
  });

  it('難易度3ステップのラベルが正しい', () => {
    const msg = stepContentMessage(MOCK_STEP_HARD, 5);
    expect(msg.text).toContain('Lv.3');
    expect(msg.text).toContain('Step 6');
  });
});

describe('stepCompleteMessage', () => {
  it('完了ステップ名と達成数を含む', () => {
    const msg = stepCompleteMessage(MOCK_STEP, 3, false, 4);
    expect(msg.text).toContain('請求書作成');
    expect(msg.text).toContain('3ステップ達成');
  });

  it('レベルアップ時にレベルアップメッセージを含む', () => {
    const msg = stepCompleteMessage(MOCK_STEP, 3, true, 5);
    expect(msg.text).toContain('レベルアップ');
    expect(msg.text).toContain('Lv.5');
  });

  it('レベルアップしない場合はレベルアップメッセージなし', () => {
    const msg = stepCompleteMessage(MOCK_STEP, 3, false, 4);
    expect(msg.text).not.toContain('レベルアップ');
  });

  it('次のステップへのQuick Replyがある', () => {
    const msg = stepCompleteMessage(MOCK_STEP, 3, false, 4);
    expect(msg.quickReply?.items).toHaveLength(2);
  });
});

describe('allStepsCompleteMessage', () => {
  it('完了数とレベルを含む', () => {
    const msg = allStepsCompleteMessage(30, 45);
    expect(msg.text).toContain('30ステップ');
    expect(msg.text).toContain('Lv.45');
  });
});

describe('stepStumbleMessage', () => {
  it('howタイプでヒントメッセージを返す', () => {
    const msg = stepStumbleMessage(MOCK_STEP, 'how');
    expect(msg.text).toContain('ヒント');
    expect(msg.text).toContain('請求書作成');
  });

  it('timeタイプでアドバイスメッセージを返す', () => {
    const msg = stepStumbleMessage(MOCK_STEP, 'time');
    expect(msg.text).toContain('アドバイス');
    expect(msg.text).toContain('約15分');
  });

  it('motivationタイプで応援メッセージを返す', () => {
    const msg = stepStumbleMessage(MOCK_STEP, 'motivation');
    expect(msg.text).toContain('応援');
  });

  it('再挑戦/スキップのQuick Replyがある', () => {
    const msg = stepStumbleMessage(MOCK_STEP, 'how');
    expect(msg.quickReply?.items).toHaveLength(2);
    const retryAction = msg.quickReply?.items[0].action;
    if (retryAction?.type === 'postback') {
      expect(retryAction.data).toContain('action=step_retry');
    }
    const skipAction = msg.quickReply?.items[1].action;
    if (skipAction?.type === 'postback') {
      expect(skipAction.data).toContain('action=step_skip');
    }
  });
});

describe('stepPauseMessage', () => {
  it('再開方法を案内する', () => {
    const msg = stepPauseMessage();
    expect(msg.text).toContain('ステップ');
  });
});

describe('stepActiveGuideMessage', () => {
  it('現在のステップ名を含む', () => {
    const msg = stepActiveGuideMessage('請求書作成');
    expect(msg.text).toContain('請求書作成');
    expect(msg.text).toContain('取り組み中');
  });

  it('コマンド案内を含む', () => {
    const msg = stepActiveGuideMessage('テスト');
    expect(msg.text).toContain('ステップ');
    expect(msg.text).toContain('診断');
  });
});
