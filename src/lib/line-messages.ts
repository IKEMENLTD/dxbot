// ===== LINE メッセージテンプレート =====

import type { TextMessage, FlexMessage, LineMessage } from './line-types';
import type { AxisScores } from './types';
import type { DiagnosisQuestion } from './diagnosis';
import { INDUSTRIES, generateResultMessage } from './diagnosis';

/**
 * Welcomeメッセージ
 */
export function welcomeMessage(name: string | null): TextMessage {
  const greeting = name ? `${name}さん、` : '';
  return {
    type: 'text',
    text: [
      `${greeting}友だち追加ありがとうございます！`,
      `DXBOTは、御社のDX（デジタル化）を`,
      `ステップ形式でサポートするBOTです。`,
      ``,
      `まずは簡単な診断（6問）で`,
      `御社の現状を把握させてください。`,
      ``,
      `診断を始めてもよろしいですか？`,
    ].join('\n'),
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'postback',
            label: 'はい、始めます',
            data: 'action=consent&value=yes',
            displayText: 'はい、始めます',
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: 'あとで',
            data: 'action=consent&value=no',
            displayText: 'あとで',
          },
        },
      ],
    },
  };
}

/**
 * 同意確認メッセージ
 */
export function consentMessage(): TextMessage {
  return {
    type: 'text',
    text: '診断を始めてもよろしいですか？',
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'postback',
            label: 'はい、始めます',
            data: 'action=consent&value=yes',
            displayText: 'はい、始めます',
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: 'あとで',
            data: 'action=consent&value=no',
            displayText: 'あとで',
          },
        },
      ],
    },
  };
}

/**
 * 業種選択メッセージ（Q1）
 */
export function industrySelectMessage(): TextMessage {
  return {
    type: 'text',
    text: 'Q1: 御社の業種を教えてください',
    quickReply: {
      items: INDUSTRIES.map((ind) => ({
        type: 'action' as const,
        action: {
          type: 'postback' as const,
          label: ind,
          data: `action=industry&value=${ind}`,
          displayText: ind,
        },
      })),
    },
  };
}

/**
 * 確認フィードバック（業種選択後）
 */
export function industryConfirmMessage(industry: string): TextMessage {
  return {
    type: 'text',
    text: `${industry}ですね！それでは診断を始めます。\n5つの質問に答えてください。`,
  };
}

/**
 * 診断質問メッセージ（Q2〜Q6）
 */
export function diagnosisQuestionMessage(question: DiagnosisQuestion): TextMessage {
  const qNum = question.index + 1; // 1-indexed表示
  return {
    type: 'text',
    text: `Q${qNum}: ${question.question}`,
    quickReply: {
      items: question.options.map((opt) => ({
        type: 'action' as const,
        action: {
          type: 'postback' as const,
          label: String(opt.label),
          data: `action=diagnosis&axis=${String(question.axis)}&value=${String(opt.value)}`,
          displayText: String(opt.label),
        },
      })),
    },
  };
}

/**
 * 診断結果メッセージ
 */
export function diagnosisResultMessage(
  scores: AxisScores,
  band: 1 | 2 | 3 | 4,
  weakAxis: keyof AxisScores,
  industry: string | null
): TextMessage {
  return {
    type: 'text',
    text: generateResultMessage(scores, band, weakAxis, industry),
  };
}

/**
 * ステップ開始メッセージ
 */
export function stepStartMessage(stepName: string): TextMessage {
  return {
    type: 'text',
    text: [
      `--- ステップ開始 ---`,
      ``,
      `次のステップ: ${stepName}`,
      ``,
      `準備ができたら「スタート」と送信してください。`,
    ].join('\n'),
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'postback',
            label: 'スタート',
            data: 'action=step_start',
            displayText: 'スタート',
          },
        },
      ],
    },
  };
}

/**
 * 「あとで」を選んだ場合のメッセージ
 */
export function laterMessage(): TextMessage {
  return {
    type: 'text',
    text: 'いつでも「診断」と送信していただければ始められます！',
  };
}

/**
 * 不明な入力へのフォールバック
 */
export function fallbackMessage(): TextMessage {
  return {
    type: 'text',
    text: '申し訳ありません、その入力には対応していません。\n「診断」と送信すると診断を開始できます。',
  };
}

/**
 * 複数メッセージをまとめて返す型安全ヘルパー
 */
export function toMessages(...msgs: (TextMessage | FlexMessage)[]): LineMessage[] {
  return msgs;
}
