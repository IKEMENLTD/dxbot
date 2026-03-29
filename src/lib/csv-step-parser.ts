// ===== ステップCSVパーサー =====

import type { StepDefinition, StepHints } from "./step-master";
import type { AxisScores } from "./types";

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

export interface CsvParseError {
  row: number;
  column?: string;
  message: string;
}

export interface CsvParseResult {
  steps: StepDefinition[];
  errors: CsvParseError[];
  warnings: string[];
}

export interface StepModified {
  before: StepDefinition;
  after: StepDefinition;
  changedFields: string[];
}

export interface StepDiff {
  added: StepDefinition[];
  modified: StepModified[];
  unchanged: StepDefinition[];
  removed: StepDefinition[];
}

// ---------------------------------------------------------------------------
// C1: CSV全文パーサー（ダブルクォート内改行対応）
// ---------------------------------------------------------------------------

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let fields: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else if ((ch === "\r" || ch === "\n") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      fields.push(current);
      if (fields.some((f) => f.trim() !== "")) rows.push(fields);
      fields = [];
      current = "";
    } else {
      current += ch;
    }
  }
  // 最終行
  fields.push(current);
  if (fields.some((f) => f.trim() !== "")) rows.push(fields);
  return rows;
}

// ---------------------------------------------------------------------------
// バリデーション定数
// ---------------------------------------------------------------------------

const STEP_ID_PATTERN = /^S\d{2,3}$/;
const VALID_AXES: ReadonlySet<string> = new Set<string>(["a1", "a2", "b", "c", "d"]);
const VALID_DIFFICULTIES: ReadonlySet<number> = new Set([1, 2, 3]);
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 2000;
const MIN_MINUTES = 1;
const MAX_MINUTES = 480;

// ---------------------------------------------------------------------------
// parseCsvToSteps
// ---------------------------------------------------------------------------

export function parseCsvToSteps(csvText: string): CsvParseResult {
  const steps: StepDefinition[] = [];
  const errors: CsvParseError[] = [];
  const warnings: string[] = [];

  // BOM除去
  let cleanText = csvText;
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1);
  }

  // C1: 全文パース（ダブルクォート内改行に対応）
  const rows = parseCsvRows(cleanText);
  if (rows.length === 0) {
    errors.push({ row: 0, message: "CSVにデータがありません" });
    return { steps, errors, warnings };
  }

  // H1: ヘッダー判定 - 最初のフィールドがSTEP_ID_PATTERNにマッチしなければヘッダー
  const firstRow = rows[0];
  const startIndex =
    firstRow && firstRow[0] && !STEP_ID_PATTERN.test(firstRow[0].trim())
      ? 1
      : 0;

  // C2: CSV内ID重複チェック用
  const seenIds = new Set<string>();

  for (let i = startIndex; i < rows.length; i++) {
    const rowNum = i + 1;
    const fields = rows[i];

    // H5: 12列超の行にwarning
    if (fields.length > 12) {
      warnings.push(
        `${rowNum}行目: ${fields.length}列あります（12列想定）。余分な列は無視されます`
      );
    }

    if (fields.length < 6) {
      errors.push({
        row: rowNum,
        message: `列数が不足しています（${fields.length}列、最低6列必要）`,
      });
      continue;
    }

    // [0] id (H2: フィールド取得時にtrim)
    const id = fields[0].trim();
    if (!id || !STEP_ID_PATTERN.test(id)) {
      errors.push({
        row: rowNum,
        column: "id",
        message: `ステップIDが不正です: "${id}"（例: S01, S30）`,
      });
      continue;
    }

    // C2: CSV内ID重複チェック
    if (seenIds.has(id)) {
      errors.push({
        row: rowNum,
        column: "id",
        message: `ステップID "${id}" がCSV内で重複しています`,
      });
      continue;
    }
    seenIds.add(id);

    // [1] axis (M1: 大文字小文字対応)
    const axisRaw = fields[1].trim().toLowerCase();
    if (!VALID_AXES.has(axisRaw)) {
      errors.push({
        row: rowNum,
        column: "axis",
        message: `軸が不正です: "${axisRaw}"（a1/a2/b/c/d）`,
      });
      continue;
    }
    const axis = axisRaw as keyof AxisScores;

    // [2] name
    const name = fields[2].trim();
    if (!name) {
      errors.push({ row: rowNum, column: "name", message: "ステップ名が空です" });
      continue;
    }
    if (name.length > MAX_NAME_LENGTH) {
      errors.push({
        row: rowNum,
        column: "name",
        message: `ステップ名が長すぎます（${name.length}文字、上限${MAX_NAME_LENGTH}文字）`,
      });
      continue;
    }

    // [3] description (先頭末尾の改行は除去、意図的な空白は保持)
    const description = (fields[3] ?? "").replace(/^[\r\n]+|[\r\n]+$/g, "");
    if (!description) {
      errors.push({ row: rowNum, column: "description", message: "説明が空です" });
      continue;
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      errors.push({
        row: rowNum,
        column: "description",
        message: `説明が長すぎます（${description.length}文字、上限${MAX_DESCRIPTION_LENGTH}文字）`,
      });
      continue;
    }

    // [4] difficulty
    const difficultyNum = Number(fields[4].trim());
    if (!VALID_DIFFICULTIES.has(difficultyNum)) {
      errors.push({
        row: rowNum,
        column: "difficulty",
        message: `難易度が不正です: "${fields[4].trim()}"（1/2/3）`,
      });
      continue;
    }
    const difficulty = difficultyNum as 1 | 2 | 3;

    // [5] estimatedMinutes
    const minutesRaw = fields[5].trim();
    const minutes = Number(minutesRaw);
    if (!Number.isInteger(minutes) || minutes < MIN_MINUTES || minutes > MAX_MINUTES) {
      errors.push({
        row: rowNum,
        column: "estimatedMinutes",
        message: `所要時間が不正です: "${minutesRaw}"（${MIN_MINUTES}-${MAX_MINUTES}の整数）`,
      });
      continue;
    }

    // [6] actionItems（;区切り）
    const actionItems = (fields[6] ?? "")
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s !== "");

    // [7] completionCriteria
    const completionCriteria = (fields[7] ?? "").trim() || "ステップを完了した";

    // [8] recommendedTools（;区切り）
    const recommendedTools = (fields[8] ?? "")
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s !== "");

    // [9-11] hints
    const hints: StepHints = {
      how: (fields[9] ?? "").trim(),
      motivation: (fields[10] ?? "").trim(),
      time: (fields[11] ?? "").trim(),
    };

    // 警告: ヒントが空
    if (!hints.how && !hints.motivation && !hints.time) {
      warnings.push(`行${rowNum} (${id}): ヒントが全て空です`);
    }

    steps.push({
      id,
      axis,
      name,
      description,
      difficulty,
      estimatedMinutes: minutes,
      actionItems,
      completionCriteria,
      recommendedTools,
      hints,
    });
  }

  return { steps, errors, warnings };
}

// ---------------------------------------------------------------------------
// calculateStepDiff (C3: removedを追加)
// ---------------------------------------------------------------------------

function compareHints(a: StepHints, b: StepHints): boolean {
  return a.how === b.how && a.motivation === b.motivation && a.time === b.time;
}

function compareStringArrays(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function calculateStepDiff(
  existing: StepDefinition[],
  imported: StepDefinition[]
): StepDiff {
  const existingMap = new Map<string, StepDefinition>();
  for (const step of existing) {
    existingMap.set(step.id, step);
  }

  const importedMap = new Map<string, StepDefinition>();
  for (const step of imported) {
    importedMap.set(step.id, step);
  }

  const added: StepDefinition[] = [];
  const modified: StepModified[] = [];

  for (const imp of imported) {
    const ex = existingMap.get(imp.id);

    if (!ex) {
      added.push(imp);
      continue;
    }

    // 変更フィールドを検出
    const changedFields: string[] = [];
    if (ex.name !== imp.name) changedFields.push("name");
    if (ex.description !== imp.description) changedFields.push("description");
    if (ex.axis !== imp.axis) changedFields.push("axis");
    if (ex.difficulty !== imp.difficulty) changedFields.push("difficulty");
    if (ex.estimatedMinutes !== imp.estimatedMinutes) changedFields.push("estimatedMinutes");
    if (!compareStringArrays(ex.actionItems, imp.actionItems)) changedFields.push("actionItems");
    if (ex.completionCriteria !== imp.completionCriteria) changedFields.push("completionCriteria");
    if (!compareStringArrays(ex.recommendedTools, imp.recommendedTools)) changedFields.push("recommendedTools");
    if (!compareHints(ex.hints, imp.hints)) changedFields.push("hints");

    if (changedFields.length > 0) {
      modified.push({ before: ex, after: imp, changedFields });
    }
  }

  // C3: removed - existingにあってimportedにないもの
  const removed = existing.filter((s) => !importedMap.has(s.id));

  // unchanged - existingにもimportedにもあり、かつ内容が同一
  const unchanged = existing.filter((s) => {
    const imp = importedMap.get(s.id);
    if (!imp) return false; // removed
    // modifiedに含まれていなければunchanged
    return !modified.some((m) => m.before.id === s.id);
  });

  return { added, modified, unchanged, removed };
}

// ---------------------------------------------------------------------------
// mergeSteps
// ---------------------------------------------------------------------------

export function mergeSteps(
  existing: StepDefinition[],
  imported: StepDefinition[],
  mode: "merge" | "replace"
): StepDefinition[] {
  if (mode === "replace") {
    return [...imported].sort(compareStepIds);
  }

  // merge: existing をベースに、importedのIDで上書き/追加
  const importedMap = new Map<string, StepDefinition>();
  for (const step of imported) {
    importedMap.set(step.id, step);
  }

  const result: StepDefinition[] = [];
  const processedIds = new Set<string>();

  // existingの各ステップを処理（importedにあれば上書き）
  for (const ex of existing) {
    const imp = importedMap.get(ex.id);
    result.push(imp ?? ex);
    processedIds.add(ex.id);
  }

  // importedにあってexistingにないものを追加
  for (const imp of imported) {
    if (!processedIds.has(imp.id)) {
      result.push(imp);
    }
  }

  return result.sort(compareStepIds);
}

/** ステップIDの数値ソート（S02 < S10 < S100） */
function compareStepIds(a: StepDefinition, b: StepDefinition): number {
  const numA = parseInt(a.id.slice(1), 10);
  const numB = parseInt(b.id.slice(1), 10);
  if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
  return a.id.localeCompare(b.id);
}

// ---------------------------------------------------------------------------
// generateStepCsvTemplate
// ---------------------------------------------------------------------------

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function generateStepCsvTemplate(steps: StepDefinition[]): string {
  const BOM = "\uFEFF";
  const header = "ステップID,軸,ステップ名,説明,難易度,所要時間(分),アクション項目,完了基準,推奨ツール,ヒント(やり方),ヒント(やる気),ヒント(時間)";

  const rows = steps.map((s) => {
    const fields = [
      s.id,
      s.axis,
      s.name,
      s.description,
      String(s.difficulty),
      String(s.estimatedMinutes),
      s.actionItems.join(";"),
      s.completionCriteria,
      s.recommendedTools.join(";"),
      s.hints.how,
      s.hints.motivation,
      s.hints.time,
    ];
    return fields.map(escapeCsvField).join(",");
  });

  return BOM + [header, ...rows].join("\n");
}
