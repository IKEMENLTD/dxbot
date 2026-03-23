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
 * 診断進捗バーを生成
 * 例: currentStep=2, totalSteps=6 → "■■□□□□ (2/6)"
 */
function progressBar(currentStep: number, totalSteps: number): string {
  const filled = '■'.repeat(currentStep);
  const empty = '□'.repeat(totalSteps - currentStep);
  return `${filled}${empty} (${currentStep}/${totalSteps})`;
}

/** 診断の総ステップ数（業種選択1問 + 診断5問 = 6問） */
const DIAGNOSIS_TOTAL_STEPS = 6;

/**
 * 業種選択メッセージ（Q1）
 */
export function industrySelectMessage(): TextMessage {
  return {
    type: 'text',
    text: `[Q1/${DIAGNOSIS_TOTAL_STEPS}] 御社の業種を教えてください\n${progressBar(1, DIAGNOSIS_TOTAL_STEPS)}`,
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
 * 進捗表示付き: [Q2/6] ■■□□□□ (2/6)
 */
export function diagnosisQuestionMessage(question: DiagnosisQuestion): TextMessage {
  const qNum = question.index + 1; // 1-indexed表示（業種=Q1, 以降Q2〜Q6）
  return {
    type: 'text',
    text: `[Q${qNum}/${DIAGNOSIS_TOTAL_STEPS}] ${question.question}\n${progressBar(qNum, DIAGNOSIS_TOTAL_STEPS)}`,
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

// ===== CTA メッセージテンプレート =====

import type { CtaTrigger, ExitType } from './types';

/** 出口タイプの日本語ラベル */
const EXIT_LABELS: Record<ExitType, string> = {
  techstars: 'TECHSTARS研修',
  taskmate: 'TaskMate',
  veteran_ai: 'ベテランAI',
  custom_dev: '受託開発',
};

/** 出口タイプごとのCTAヘッドライン */
const EXIT_HEADLINES: Record<ExitType, string> = {
  techstars: 'まずスタッフのITスキルを底上げ',
  taskmate: '半年で自走できる伴走プラン',
  veteran_ai: '請求・経費・ナレッジをAIで一括管理',
  custom_dev: '御社専用システムを補助金で構築',
};

/** 出口タイプごとのCTA説明文 */
const EXIT_DESCRIPTIONS: Record<ExitType, string> = {
  techstars: [
    'ツールを入れる前に、使いこなせる人を育てませんか。',
    '業種向けの研修プランがあります。',
    '3ヶ月で基礎が身につきます。',
  ].join('\n'),
  taskmate: [
    '毎週のステップ、専任サポート付きで。',
    '月5万×6ヶ月。',
  ].join('\n'),
  veteran_ai: [
    'ベテランAIで課題を解決。',
    'インボイス対応もこれ1つ。',
    'MAX550万補助。',
  ].join('\n'),
  custom_dev: [
    '汎用ツールでは解決しにくい課題を根本解決。',
    'MAX450万補助。',
  ].join('\n'),
};

/** 出口タイプごとのCTAボタンラベル */
const EXIT_CTA_LABELS: Record<ExitType, string> = {
  techstars: '研修の詳細を見る',
  taskmate: '詳しく聞く',
  veteran_ai: '無料デモ',
  custom_dev: '相談する',
};

/** トリガー理由のパーソナライズ文 */
const TRIGGER_REASONS: Record<CtaTrigger, string> = {
  action_boost: '行動が加速しています！次のステージへ進みませんか？',
  apo_early: 'アポからのスタートで素晴らしい進捗です。',
  subsidy_timing: '補助金の申請時期です。このタイミングを活かしませんか？',
  lv40_reached: 'Lv.40到達、おめでとうございます！さらなるDX推進へ。',
  invoice_stumble: '請求まわりの課題、まとめて解決できます。',
  it_literacy: 'ITの基礎から一緒にステップアップしましょう。',
};

/**
 * CTA提案メッセージ（Flex Message）
 * トリガー理由に応じたパーソナライズ + 出口ごとの案内
 */
export function ctaProposalMessage(
  trigger: CtaTrigger,
  exit: ExitType,
  ctaId: string
): FlexMessage {
  const triggerReason = TRIGGER_REASONS[trigger];
  const exitLabel = EXIT_LABELS[exit];
  const exitHeadline = EXIT_HEADLINES[exit];
  const exitDesc = EXIT_DESCRIPTIONS[exit];
  const ctaLabel = EXIT_CTA_LABELS[exit];

  return {
    type: 'flex',
    altText: `${exitLabel}のご提案`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: exitHeadline,
            size: 'lg',
            weight: 'bold',
            color: '#1a1a1a',
          },
        ],
        paddingAll: '16px',
        backgroundColor: '#f0f9ff',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: triggerReason,
            size: 'sm',
            wrap: true,
            color: '#1a73e8',
            weight: 'bold',
          },
          {
            type: 'separator',
            margin: 'md',
            color: '#e0e0e0',
          },
          {
            type: 'text',
            text: exitLabel,
            size: 'md',
            weight: 'bold',
            margin: 'md',
            color: '#1a1a1a',
          },
          {
            type: 'text',
            text: exitDesc,
            size: 'sm',
            wrap: true,
            margin: 'sm',
            color: '#555555',
          },
        ],
        spacing: 'sm',
        paddingAll: '16px',
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'postback',
              label: ctaLabel,
              data: `action=cta_response&ctaId=${ctaId}&value=interested`,
              displayText: ctaLabel,
            },
            style: 'primary',
            color: '#1a73e8',
          },
          {
            type: 'button',
            action: {
              type: 'postback',
              label: '今はいい',
              data: `action=cta_response&ctaId=${ctaId}&value=decline`,
              displayText: '今はいい',
            },
            style: 'secondary',
            margin: 'sm',
          },
        ],
        paddingAll: '16px',
      },
    },
  };
}

/**
 * CTA「詳しく聞く」応答時のユーザー向けメッセージ
 */
export function ctaInterestedReplyMessage(): TextMessage {
  return {
    type: 'text',
    text: [
      'ありがとうございます！',
      '',
      '担当者から改めてご連絡いたします。',
      'お気軽にご質問をお待ちしております。',
    ].join('\n'),
  };
}

/**
 * CTA「今はいい」応答時のユーザー向けメッセージ
 */
export function ctaDeclineReplyMessage(): TextMessage {
  return {
    type: 'text',
    text: [
      '承知しました。',
      '',
      'またタイミングが合えばご提案させていただきます。',
      '引き続きステップを進めていきましょう！',
    ].join('\n'),
  };
}

// ===== リマインダーメッセージ群 =====

/** リマインダーレベル */
export type ReminderLevel = 'light' | 'medium' | 'final';

/**
 * 3日放置: 軽いリマインダー（進捗確認 + 現在のステップ名）
 */
export function reminderLightMessage(stepName: string | null): TextMessage {
  const stepInfo = stepName ? `\n現在のステップ: ${stepName}` : '';
  return {
    type: 'text',
    text: [
      `--- お知らせ ---`,
      ``,
      `最近の進捗はいかがですか？${stepInfo}`,
      ``,
      `お時間のあるときに、`,
      `少しずつ進めてみてください。`,
      ``,
      `「ステップ」と送信すると再開できます。`,
    ].join('\n'),
  };
}

/**
 * 7日放置: 強めのリマインダー（ステップが待っている + Quick Reply）
 */
export function reminderMediumMessage(stepName: string | null): TextMessage {
  const stepInfo = stepName ? `「${stepName}」が` : 'ステップが';
  return {
    type: 'text',
    text: [
      `--- リマインダー ---`,
      ``,
      `${stepInfo}待っています。`,
      ``,
      `DX改善は一歩ずつで大丈夫です。`,
      `いつでも再開できます。`,
    ].join('\n'),
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '再開する',
            data: 'action=reminder_resume',
            displayText: '再開する',
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '一時停止',
            data: 'action=reminder_pause',
            displayText: '一時停止',
          },
        },
      ],
    },
  };
}

/**
 * 14日放置: 最終リマインダー（最終案内 + Quick Reply）
 */
export function reminderFinalMessage(): TextMessage {
  return {
    type: 'text',
    text: [
      `--- 最終リマインダー ---`,
      ``,
      `いつでも再開できます。`,
      ``,
      `DXの取り組みを再開したいときは、`,
      `「ステップ」と送信してください。`,
      ``,
      `今後のご連絡が不要な場合は、`,
      `下のボタンからお知らせください。`,
    ].join('\n'),
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '再開する',
            data: 'action=reminder_resume',
            displayText: '再開する',
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '配信停止',
            data: 'action=reminder_stop',
            displayText: '配信停止',
          },
        },
      ],
    },
  };
}

/**
 * 一時停止受付メッセージ
 */
export function reminderPauseConfirmMessage(): TextMessage {
  return {
    type: 'text',
    text: [
      '一時停止を受け付けました。',
      '',
      '7日間、リマインダーをお送りしません。',
      '再開したいときは「ステップ」と送信してください。',
    ].join('\n'),
  };
}

/**
 * 配信停止受付メッセージ
 */
export function reminderStopConfirmMessage(): TextMessage {
  return {
    type: 'text',
    text: [
      '配信停止を受け付けました。',
      '',
      '今後リマインダーをお送りしません。',
      '再開したいときは「ステップ」と送信してください。',
    ].join('\n'),
  };
}

/**
 * 再開確認メッセージ
 */
export function reminderResumeConfirmMessage(stepName: string | null): TextMessage {
  const stepInfo = stepName ? `\n次のステップ: ${stepName}` : '';
  return {
    type: 'text',
    text: [
      '再開を受け付けました！',
      `${stepInfo}`,
      '',
      '「ステップ」と送信して続きを始めましょう。',
    ].join('\n'),
  };
}

/**
 * 複数メッセージをまとめて返す型安全ヘルパー
 */
export function toMessages(...msgs: (TextMessage | FlexMessage)[]): LineMessage[] {
  return msgs;
}
