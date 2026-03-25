// ===== LINE メッセージテンプレート =====

import type { TextMessage, FlexMessage, LineMessage } from './line-types';
import type { AxisScores } from './types';
import type { StumbleType } from './types';
import type { DiagnosisQuestion } from './diagnosis';
import type { StepDefinition } from './step-master';
import { INDUSTRIES, generateResultMessage } from './diagnosis';

/**
 * Welcomeメッセージ（施策2: フロー最適化 - consentと一体化）
 */
export function welcomeMessage(name: string | null): TextMessage {
  const greeting = name ? `${name}さん、こんにちは！` : 'こんにちは！';
  return {
    type: 'text',
    text: [
      greeting,
      ``,
      `「パソコン作業をもっとラクにしたい」`,
      `そう思ったこと、ありませんか？`,
      ``,
      `DXBOTが、1日15分のカンタンな実践で`,
      `業務のムダをなくすお手伝いをします。`,
      ``,
      `まずカンタンな6問の診断で、`,
      `一番効果が出るポイントを見つけましょう！`,
      ``,
      `所要時間は約2分です。`,
      `始めてみますか？`,
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
 * 流入元質問メッセージ（フォロー直後に送信）
 */
export function sourceQuestionMessage(): TextMessage {
  return {
    type: 'text',
    text: [
      '1つだけ教えてください。',
      'DXBOTをどこで知りましたか？',
    ].join('\n'),
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '営業の紹介',
            data: 'action=source_answer&value=apo',
            displayText: '営業の紹介',
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: 'Threads',
            data: 'action=source_answer&value=threads',
            displayText: 'Threads',
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: 'X',
            data: 'action=source_answer&value=x',
            displayText: 'X',
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: 'Instagram',
            data: 'action=source_answer&value=instagram',
            displayText: 'Instagram',
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '知人の紹介',
            data: 'action=source_answer&value=referral',
            displayText: '知人の紹介',
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: 'その他',
            data: 'action=source_answer&value=other',
            displayText: 'その他',
          },
        },
      ],
    },
  };
}

/**
 * 同意確認メッセージ（再診断・テキスト入力時用）
 */
export function consentMessage(): TextMessage {
  return {
    type: 'text',
    text: [
      'カンタンな6問の診断で、',
      '今すぐ改善できるポイントが分かります。',
      '',
      '所要時間は約2分です。',
      '始めてみますか？',
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
  industry: string | null,
  estimatedMinutes?: number
): TextMessage {
  return {
    type: 'text',
    text: generateResultMessage(scores, band, weakAxis, industry, estimatedMinutes),
  };
}

/**
 * ステップ開始案内メッセージ（診断完了後に表示）
 */
export function stepStartMessage(stepName: string, estimatedMinutes?: number): TextMessage {
  const minutes = estimatedMinutes ?? 15;
  return {
    type: 'text',
    text: [
      `次の実践テーマが決まりました！`,
      ``,
      `「${stepName}」`,
      ``,
      `約${minutes}分でできる内容です。`,
      `スタートを押すと詳しい手順が届きます。`,
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
 * タイトル・説明・アクション・完了基準・推奨ツール + 完了/つまずきボタン
 */
export function stepContentMessage(step: StepDefinition, completedCount: number): TextMessage {
  const lines: string[] = [
    `実践 ${completedCount + 1}:`,
    ``,
    `[${step.name}]`,
    step.description,
    ``,
  ];

  // アクションアイテム
  if (step.actionItems && step.actionItems.length > 0) {
    lines.push(`やること:`);
    step.actionItems.forEach((item, i) => {
      lines.push(`${i + 1}. ${item}`);
    });
    lines.push(``);
  }

  // 完了基準
  if (step.completionCriteria) {
    lines.push(`完了の目安: ${step.completionCriteria}`);
  }

  lines.push(`所要時間: 約${step.estimatedMinutes}分`);

  // 推奨ツール
  if (step.recommendedTools && step.recommendedTools.length > 0) {
    lines.push(`推奨ツール: ${step.recommendedTools.slice(0, 2).join('、')}`);
  }

  lines.push(``);
  lines.push(`取り組んだら結果を教えてください。`);

  return {
    type: 'text',
    text: lines.join('\n'),
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
            label: 'もう少し詳しく知りたい',
            data: `action=step_stumble&stepId=${step.id}&type=how`,
            displayText: 'もう少し詳しく知りたい',
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '今週は忙しい',
            data: `action=step_stumble&stepId=${step.id}&type=time`,
            displayText: '今週は忙しい',
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '他のステップを先にやりたい',
            data: `action=step_stumble&stepId=${step.id}&type=motivation`,
            displayText: '他のステップを先にやりたい',
          },
        },
      ],
    },
  };
}

/** 進捗バー生成（10段階: 完了数/30ステップ） */
function stepProgressBar(completedCount: number, totalSteps: number): string {
  const ratio = Math.min(completedCount / totalSteps, 1);
  const filled = Math.round(ratio * 10);
  const empty = 10 - filled;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
}

/**
 * ステップ完了時の祝福メッセージ + 次ステップ案内
 */
export function stepCompleteMessage(
  completedStep: StepDefinition,
  completedCount: number,
  levelUp: boolean,
  newLevel: number,
  nextStep?: StepDefinition | null
): TextMessage {
  const lines: string[] = [
    `「${completedStep.name}」クリアです！`,
    `おつかれさまでした！`,
    ``,
    `進捗: ${stepProgressBar(completedCount, 30)} ${completedCount}/30ステップ`,
  ];

  if (levelUp) {
    lines.push(``);
    lines.push(`Lv.${newLevel}にアップしました！`);
  }

  if (nextStep) {
    lines.push(``);
    lines.push(`次は「${nextStep.name}」、約${nextStep.estimatedMinutes}分です。`);
  }

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

/** つまずきタイプ別ヒントメッセージ（ステップ個別ヒント優先） */
function buildStumbleHint(step: StepDefinition, stumbleType: StumbleType): string {
  // ステップ個別ヒントがある場合はそちらを使用
  const stepHint = step.hints?.[stumbleType];

  switch (stumbleType) {
    case 'how':
      return [
        `「${step.name}」のやり方について:`,
        ``,
        stepHint ?? [
          `まずは以下を試してみてください:`,
          `1. 無料ツールから始める（有料は後でOK）`,
          `2. 完璧を目指さず、まず触ってみる`,
        ].join('\n'),
        ``,
        ...(step.recommendedTools && step.recommendedTools.length > 0
          ? [`推奨ツール: ${step.recommendedTools.join('、')}`, ``]
          : []),
        `それでも分からない場合は、`,
        `専門スタッフがサポートします。`,
      ].join('\n');

    case 'time':
      return [
        stepHint ?? `お忙しい中、取り組もうとする姿勢が大切です。`,
        ``,
        `「${step.name}」は約${step.estimatedMinutes}分で完了できます。`,
        `隙間時間に少しずつ進めてみてください。`,
        ``,
        `準備ができたらもう一度挑戦しましょう。`,
      ].join('\n');

    case 'motivation':
      return [
        stepHint ?? `DX改善は一歩ずつで大丈夫です。`,
        ``,
        `「${step.name}」を完了すると、`,
        `${AXIS_LABELS[step.axis]}の改善につながります。`,
        ``,
        `気が向いたときにもう一度トライしてみてください。`,
      ].join('\n');
  }
}

/**
 * つまずき時のヒントメッセージ
 */
export function stepStumbleMessage(
  step: StepDefinition,
  stumbleType: StumbleType
): TextMessage {
  return {
    type: 'text',
    text: buildStumbleHint(step, stumbleType),
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
    'ツール導入の前に、使える人を育てませんか。',
    '業種に合わせた研修プランをご用意しています。',
  ].join('\n'),
  taskmate: [
    '専任サポート付きで、毎週一歩ずつ前進。',
    '詳しい内容をお伝えできます。',
  ].join('\n'),
  veteran_ai: [
    'インボイス対応も経費管理も、これ1つで完結。',
    '最大550万円の補助金が使えます。',
  ].join('\n'),
  custom_dev: [
    '汎用ツールでは難しい課題を、根本から解決。',
    '最大450万円の補助金が活用できます。',
  ].join('\n'),
};

/** 出口タイプごとのCTAボタンラベル */
const EXIT_CTA_LABELS: Record<ExitType, string> = {
  techstars: '無料で相談する',
  taskmate: '無料で相談する',
  veteran_ai: '無料で相談する',
  custom_dev: '無料で相談する',
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
              label: 'また今度',
              data: `action=cta_response&ctaId=${ctaId}&value=decline`,
              displayText: 'また今度',
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
      '1〜2営業日以内に、担当者からご連絡します。',
      'その前にご質問があれば、',
      'ここにメッセージを送ってください。',
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
 * 3日放置: 軽いリマインダー（進捗確認 + 現在のステップ名 + 所要時間）
 */
export function reminderLightMessage(stepName: string | null, estimatedMinutes?: number): TextMessage {
  const stepInfo = stepName ? `\n「${stepName}」が待っています。` : '';
  const timeInfo = estimatedMinutes ? `約${estimatedMinutes}分で完了できます。` : '';
  return {
    type: 'text',
    text: [
      `最近の進捗はいかがですか？${stepInfo}`,
      timeInfo,
      ``,
      `お時間のあるときに、`,
      `少しずつ進めてみてください。`,
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
 * 7日放置: 強めのリマインダー（ステップが待っている + Quick Reply）
 */
export function reminderMediumMessage(stepName: string | null, estimatedMinutes?: number): TextMessage {
  const stepInfo = stepName ? `「${stepName}」が` : 'ステップが';
  const timeInfo = estimatedMinutes ? `約${estimatedMinutes}分で完了できます。\n` : '';
  return {
    type: 'text',
    text: [
      `${stepInfo}待っています。`,
      timeInfo,
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
export function reminderFinalMessage(stepName?: string | null, estimatedMinutes?: number): TextMessage {
  const stepInfo = stepName ? `「${stepName}」が待っています。\n` : '';
  const timeInfo = estimatedMinutes ? `約${estimatedMinutes}分で完了できます。\n` : '';
  return {
    type: 'text',
    text: [
      `${stepInfo}${timeInfo}`,
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
