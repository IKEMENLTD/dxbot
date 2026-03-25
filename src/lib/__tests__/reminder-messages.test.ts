// ===== リマインダーメッセージ テスト =====

import { describe, it, expect } from 'vitest';
import {
  reminderLightMessage,
  reminderMediumMessage,
  reminderFinalMessage,
  reminderPauseConfirmMessage,
  reminderStopConfirmMessage,
  reminderResumeConfirmMessage,
} from '../line-messages';

describe('reminderLightMessage', () => {
  it('ステップ名ありで進捗確認メッセージを生成する', () => {
    const msg = reminderLightMessage('請求書作成');
    expect(msg.type).toBe('text');
    expect(msg.text).toContain('最近の進捗はいかがですか？');
    expect(msg.text).toContain('請求書作成');
    expect(msg.quickReply).toBeDefined();
    expect(msg.quickReply?.items).toHaveLength(2);
  });

  it('ステップ名なしで進捗確認メッセージを生成する', () => {
    const msg = reminderLightMessage(null);
    expect(msg.type).toBe('text');
    expect(msg.text).toContain('最近の進捗はいかがですか？');
  });
});

describe('reminderMediumMessage', () => {
  it('ステップ名ありでリマインダーメッセージを生成する', () => {
    const msg = reminderMediumMessage('インボイス設定');
    expect(msg.type).toBe('text');
    expect(msg.text).toContain('「インボイス設定」が待っています');
    expect(msg.quickReply).toBeDefined();
    expect(msg.quickReply?.items).toHaveLength(2);
  });

  it('ステップ名なしでリマインダーメッセージを生成する', () => {
    const msg = reminderMediumMessage(null);
    expect(msg.text).toContain('ステップが待っています');
  });

  it('再開するボタンが含まれている', () => {
    const msg = reminderMediumMessage('テスト');
    const resumeItem = msg.quickReply?.items[0];
    expect(resumeItem?.action.type).toBe('postback');
    if (resumeItem?.action.type === 'postback') {
      expect(resumeItem.action.data).toBe('action=reminder_resume');
      expect(resumeItem.action.label).toBe('再開する');
    }
  });

  it('一時停止ボタンが含まれている', () => {
    const msg = reminderMediumMessage('テスト');
    const pauseItem = msg.quickReply?.items[1];
    expect(pauseItem?.action.type).toBe('postback');
    if (pauseItem?.action.type === 'postback') {
      expect(pauseItem.action.data).toBe('action=reminder_pause');
      expect(pauseItem.action.label).toBe('一時停止');
    }
  });
});

describe('reminderFinalMessage', () => {
  it('最終リマインダーメッセージを生成する', () => {
    const msg = reminderFinalMessage();
    expect(msg.type).toBe('text');
    expect(msg.text).toContain('いつでも再開できます');
    expect(msg.quickReply).toBeDefined();
    expect(msg.quickReply?.items).toHaveLength(2);
  });

  it('再開するボタンが含まれている', () => {
    const msg = reminderFinalMessage();
    const resumeItem = msg.quickReply?.items[0];
    expect(resumeItem?.action.type).toBe('postback');
    if (resumeItem?.action.type === 'postback') {
      expect(resumeItem.action.data).toBe('action=reminder_resume');
    }
  });

  it('配信停止ボタンが含まれている', () => {
    const msg = reminderFinalMessage();
    const stopItem = msg.quickReply?.items[1];
    expect(stopItem?.action.type).toBe('postback');
    if (stopItem?.action.type === 'postback') {
      expect(stopItem.action.data).toBe('action=reminder_stop');
      expect(stopItem.action.label).toBe('配信停止');
    }
  });
});

describe('reminderPauseConfirmMessage', () => {
  it('一時停止確認メッセージを生成する', () => {
    const msg = reminderPauseConfirmMessage();
    expect(msg.type).toBe('text');
    expect(msg.text).toContain('一時停止を受け付けました');
    expect(msg.text).toContain('7日間');
  });
});

describe('reminderStopConfirmMessage', () => {
  it('配信停止確認メッセージを生成する', () => {
    const msg = reminderStopConfirmMessage();
    expect(msg.type).toBe('text');
    expect(msg.text).toContain('配信停止を受け付けました');
  });
});

describe('reminderResumeConfirmMessage', () => {
  it('ステップ名ありで再開確認メッセージを生成する', () => {
    const msg = reminderResumeConfirmMessage('売上管理シート');
    expect(msg.type).toBe('text');
    expect(msg.text).toContain('再開を受け付けました');
    expect(msg.text).toContain('売上管理シート');
  });

  it('ステップ名なしで再開確認メッセージを生成する', () => {
    const msg = reminderResumeConfirmMessage(null);
    expect(msg.text).toContain('再開を受け付けました');
    expect(msg.text).not.toContain('次のステップ:');
  });
});
