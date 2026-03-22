// ===== 営業武器メール生成 =====

import type { AxisScores, ExitType } from './types';
import type { RecommendResult } from './recommend-engine';

// ---------------------------------------------------------------------------
// 入力型定義
// ---------------------------------------------------------------------------

export interface SalesEmailInput {
  userName: string;
  companyName: string;
  industry: string;
  recommendation: RecommendResult;
  axisScores: AxisScores;
  level: number;
  leadNote: string | null;
}

// ---------------------------------------------------------------------------
// 出口別テンプレート
// ---------------------------------------------------------------------------

interface ExitTemplate {
  label: string;
  talkScript: string;
  ltvEstimate: string;
}

function getExitTemplate(exit: ExitType, industry: string): ExitTemplate {
  const templates: Record<ExitType, ExitTemplate> = {
    techstars: {
      label: 'TECHSTARS研修',
      talkScript: `${industry}の現場でも、ITの基礎を身につけるだけで業務効率が大幅に変わります。まずは3ヶ月の研修プログラムで、社員全員がデジタルツールを使いこなせる土台を作りませんか？`,
      ltvEstimate: '初期: 10〜15万円 / 研修後アップセル: ベテランAI or TaskMate（50〜500万円）',
    },
    taskmate: {
      label: 'TaskMate',
      talkScript: `${industry}で日々発生する繰り返し業務、TaskMateで自動化できます。月額利用で初期投資を抑えつつ、すぐに効果を実感いただけます。`,
      ltvEstimate: '月額3〜10万円 x 24ヶ月 = 72〜240万円',
    },
    veteran_ai: {
      label: 'ベテランAI',
      talkScript: `${industry}の請求・売上管理をAIが自動化します。補助金を活用すれば実質負担は2割程度。インボイス対応も含めて一気に解決しませんか？`,
      ltvEstimate: '補助金適用: 550万円（実質110万円） / 通常: 月額5〜20万円 x 24ヶ月',
    },
    custom_dev: {
      label: '受託開発',
      talkScript: `${industry}の業務に完全フィットしたシステムを開発します。補助金を活用すれば、300万円規模の開発も実質100万円以下で実現可能です。`,
      ltvEstimate: '補助金適用: 300〜1,000万円（実質100〜350万円） / 保守月額5〜15万円',
    },
  };

  return templates[exit];
}

// ---------------------------------------------------------------------------
// 軸スコアサマリー生成
// ---------------------------------------------------------------------------

function formatAxisSummary(scores: AxisScores): string {
  const labels: Record<keyof AxisScores, string> = {
    a1: '売上・請求',
    a2: '連絡・記録',
    b: '繰り返し作業',
    c: 'データ経営',
    d: 'ツール習熟',
  };

  return (Object.keys(scores) as (keyof AxisScores)[])
    .map((key) => `  ${labels[key]}: ${scores[key]}pt`)
    .join('\n');
}

// ---------------------------------------------------------------------------
// メール生成
// ---------------------------------------------------------------------------

/** 営業武器メールを生成 */
export function generateSalesEmail(input: SalesEmailInput): string {
  const { userName, companyName, industry, recommendation, axisScores, level, leadNote } = input;

  const primaryTemplate = getExitTemplate(recommendation.primaryExit, industry);
  const secondaryLine = recommendation.secondaryExit
    ? getExitTemplate(recommendation.secondaryExit, industry).label
    : 'なし';

  const reasonsList = recommendation.reasons.map((r) => `  - ${r}`).join('\n');
  const noteSection = leadNote ? `\n■ 顧客メモ：${leadNote}` : '';

  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DXBOT 営業武器メール
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 対象：${userName} 様（${companyName} / ${industry}）
■ 現在レベル：Lv.${level}
■ 診断スコア：
${formatAxisSummary(axisScores)}
${noteSection}

━━━ レコメンド結果 ━━━

■ 推奨出口：${primaryTemplate.label}（確度${recommendation.confidence}%）
■ 根拠：
${reasonsList}
■ 2段目候補：${secondaryLine}（${recommendation.secondaryScore}pt）

━━━ 提案トーク ━━━

${primaryTemplate.talkScript}

━━━ LTV試算 ━━━

${primaryTemplate.ltvEstimate}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
※ このメールはDXBOTレコメンドエンジンにより自動生成されました
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}
