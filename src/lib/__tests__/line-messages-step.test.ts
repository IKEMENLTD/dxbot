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
  description: '無料の請求書作成ツールで、実際に1枚請求書を作成してみましょう。テンプレートを選ぶだけで、すぐに作れます。',
  axis: 'a1',
  difficulty: 1,
  estimatedMinutes: 15,
  actionItems: ['freee、Misoca、またはマネーフォワードクラウドで無料アカウントを作成', 'テンプレートを選んで自社情報を入力', 'サンプル請求書を1枚作成して保存'],
  completionCriteria: '請求書を1枚作成して保存できた',
  recommendedTools: ['freee請求書（無料）', 'Misoca（無料枠あり）'],
  hints: {
    how: 'freeeなら https://www.freee.co.jp/invoice/ から始められます。アカウント作成は3分で完了します。',
    motivation: '1枚作るだけで、次回から同じテンプレートを使い回せます。最初の1枚が一番価値があります。',
    time: 'テンプレートを選んで会社名を入れるだけなら5分です。細かい設定は後からでOKです。',
  },
};

const MOCK_STEP_HARD: StepDefinition = {
  id: 'S18',
  name: '自動化ツール導入',
  description: '実際に1つの作業を自動化ツールで自動化してみましょう。Googleフォームの回答をスプレッドシートに自動記録する、など簡単なものからスタートです。',
  axis: 'b',
  difficulty: 3,
  estimatedMinutes: 40,
  actionItems: ['自動化するタスクを1つ決める', 'Googleフォーム+スプレッドシート連携を設定', 'テストして動作確認'],
  completionCriteria: '1つの業務タスクを自動化し、テストで動作を確認できた',
  recommendedTools: ['Googleフォーム（無料）', 'Zapier（無料枠あり）'],
  hints: {
    how: 'Googleフォームで問い合わせフォームを作ると、回答が自動でスプレッドシートに記録されます。',
    motivation: '1つ自動化するだけで「こんなに楽になるのか」を実感できます。',
    time: 'Gmailフィルタの設定なら10分です。',
  },
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
    expect(msg.text).toContain('無料の請求書作成ツールで');
    expect(msg.text).toContain('やること:');
    expect(msg.text).toContain('完了の目安:');
    expect(msg.text).toContain('約15分');
    expect(msg.text).toContain('推奨ツール:');
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
    expect(msg.text).toContain('自動化ツール導入');
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
  it('howタイプでステップ個別ヒントを返す', () => {
    const msg = stepStumbleMessage(MOCK_STEP, 'how');
    expect(msg.text).toContain('ヒント');
    expect(msg.text).toContain('請求書作成');
    expect(msg.text).toContain('freee');
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
