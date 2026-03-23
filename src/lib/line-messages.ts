// ===== LINE メッセージテンプレート =====

import type { TextMessage, FlexMessage, LineMessage } from './line-types';
import type { AxisScores } from './types';
import type { StumbleType } from './types';
import type { DiagnosisQuestion } from './diagnosis';
import type { StepDefinition } from './step-master';
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
 * ステップ開始案内メッセージ（診断完了後に表示）
 */
export function stepStartMessage(stepName: string): TextMessage {
  return {
    type: 'text',
    text: [
      `--- ステップ開始 ---`,
      ``,
      `次のステップ: ${stepName}`,
      ``,
      `準備ができたら「スタート」ボタンを押してください。`,
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

// ===== ステップ配信メッセージ群 =====

/** 難易度ラベル */
const DIFFICULTY_LABELS: Record<1 | 2 | 3, string> = {
  1: 'Lv.1（かんたん）',
  2: 'Lv.2（ふつう）',
  3: 'Lv.3（チャレンジ）',
};

/** 軸名の日本語ラベル */
const AXIS_LABELS: Record<keyof AxisScores, string> = {
  a1: '売上・請求管理',
  a2: '連絡・記録管理',
  b: '繰り返し作業の自動化',
  c: 'データ経営',
  d: 'ITツール活用',
};

/**
 * ステップ内容配信メッセージ
 * タイトル・説明・所要時間・難易度 + 完了/つまずきボタン
 */
export function stepContentMessage(step: StepDefinition, completedCount: number): TextMessage {
  return {
    type: 'text',
    text: [
      `--- Step ${completedCount + 1} ---`,
      ``,
      `[${step.name}]`,
      `${step.description}`,
      ``,
      `分野: ${AXIS_LABELS[step.axis]}`,
      `難易度: ${DIFFICULTY_LABELS[step.difficulty]}`,
      `所要時間: 約${step.estimatedMinutes}分`,
      ``,
      `取り組んだら結果を教えてください。`,
    ].join('\n'),
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '完了した',
            data: `action=step_complete&stepId=${step.id}`,
            displayText: '完了した',
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: 'やり方が分からない',
            data: `action=step_stumble&stepId=${step.id}&type=how`,
            displayText: 'やり方が分からない',
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '時間がない',
            data: `action=step_stumble&stepId=${step.id}&type=time`,
            displayText: '時間がない',
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: 'やる気が出ない',
            data: `action=step_stumble&stepId=${step.id}&type=motivation`,
            displayText: 'やる気が出ない',
          },
        },
      ],
    },
  };
}

/**
 * ステップ完了時の祝福メッセージ + 次ステップ案内
 */
export function stepCompleteMessage(
  completedStep: StepDefinition,
  completedCount: number,
  levelUp: boolean,
  newLevel: number
): TextMessage {
  const lines: string[] = [
    `--- ステップ完了 ---`,
    ``,
    `「${completedStep.name}」を完了しました！`,
    `これで${completedCount}ステップ達成です。`,
  ];

  if (levelUp) {
    lines.push(``);
    lines.push(`*** レベルアップ！ Lv.${newLevel} ***`);
  }

  lines.push(``);
  lines.push(`次のステップに進みましょう。`);

  return {
    type: 'text',
    text: lines.join('\n'),
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '次のステップへ',
            data: 'action=step_start',
            displayText: '次のステップへ',
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '今日はここまで',
            data: 'action=step_pause',
            displayText: '今日はここまで',
          },
        },
      ],
    },
  };
}

/**
 * 全ステップ完了メッセージ
 */
export function allStepsCompleteMessage(completedCount: number, level: number): TextMessage {
  return {
    type: 'text',
    text: [
      `--- 全ステップ完了 ---`,
      ``,
      `おめでとうございます！`,
      `${completedCount}ステップ全て完了しました。`,
      `現在のレベル: Lv.${level}`,
      ``,
      `DX改善の基礎が身につきました。`,
      `さらなるDX推進については、`,
      `専門家がサポートいたします。`,
      ``,
      `詳しくは担当者からご連絡します。`,
    ].join('\n'),
  };
}

/** つまずきタイプ別ヒントメッセージ */
const STUMBLE_HINTS: Record<StumbleType, (step: StepDefinition) => string> = {
  how: (step) => [
    `--- ヒント ---`,
    ``,
    `「${step.name}」のやり方について:`,
    ``,
    `まずは以下を試してみてください:`,
    `1. 「${step.name}」で検索して概要を確認`,
    `2. 無料ツールから始める（有料は後でOK）`,
    `3. 完璧を目指さず、まず触ってみる`,
    ``,
    `それでも分からない場合は、`,
    `専門スタッフがサポートします。`,
  ].join('\n'),

  time: (step) => [
    `--- アドバイス ---`,
    ``,
    `お忙しい中、取り組もうとする姿勢が大切です。`,
    ``,
    `「${step.name}」は約${step.estimatedMinutes}分で完了できます。`,
    `隙間時間に少しずつ進めてみてください。`,
    ``,
    `準備ができたらもう一度挑戦しましょう。`,
  ].join('\n'),

  motivation: (step) => [
    `--- 応援メッセージ ---`,
    ``,
    `DX改善は一歩ずつで大丈夫です。`,
    ``,
    `「${step.name}」を完了すると、`,
    `${AXIS_LABELS[step.axis]}の改善につながります。`,
    ``,
    `気が向いたときにもう一度トライしてみてください。`,
  ].join('\n'),
};

/**
 * つまずき時のヒントメッセージ
 */
export function stepStumbleMessage(
  step: StepDefinition,
  stumbleType: StumbleType
): TextMessage {
  const hintGenerator = STUMBLE_HINTS[stumbleType];
  return {
    type: 'text',
    text: hintGenerator(step),
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'postback',
            label: 'もう一度挑戦',
            data: `action=step_retry&stepId=${step.id}`,
            displayText: 'もう一度挑戦',
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: 'スキップして次へ',
            data: `action=step_skip&stepId=${step.id}`,
            displayText: 'スキップして次へ',
          },
        },
      ],
    },
  };
}

/**
 * ステップ一時停止メッセージ
 */
export function stepPauseMessage(): TextMessage {
  return {
    type: 'text',
    text: [
      `お疲れさまでした！`,
      ``,
      `続きはいつでも「ステップ」と`,
      `送信すれば再開できます。`,
    ].join('\n'),
  };
}

/**
 * step_active中のテキスト入力に対する案内メッセージ
 */
export function stepActiveGuideMessage(stepName: string): TextMessage {
  return {
    type: 'text',
    text: [
      `現在「${stepName}」に取り組み中です。`,
      ``,
      `ボタンで結果を教えてください:`,
      `- 完了した / やり方が分からない / 時間がない / やる気が出ない`,
      ``,
      `「ステップ」: 現在のステップを再表示`,
      `「診断」: 再診断を開始`,
    ].join('\n'),
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
