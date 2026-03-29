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
}

// ---------------------------------------------------------------------------
// CSV行パーサー（ダブルクォート対応）
// ---------------------------------------------------------------------------

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
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
  let text = csvText;
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  // 改行で分割、空行除去
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) {
    errors.push({ row: 0, message: "CSVにデータがありません" });
    return { steps, errors, warnings };
  }

  // ヘッダー行判定
  let startIndex = 0;
  const firstLine = lines[0].trim().toLowerCase();
  if (firstLine.startsWith("ステップid") || firstLine.startsWith("id")) {
    startIndex = 1;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const rowNum = i + 1;
    const fields = parseCsvLine(lines[i]);

    if (fields.length < 6) {
      errors.push({ row: rowNum, message: `列数が不足しています（${fields.length}列、最低6列必要）` });
      continue;
    }

    // [0] id
    const id = fields[0];
    if (!id || !STEP_ID_PATTERN.test(id)) {
      errors.push({ row: rowNum, column: "id", message: `ステップIDが不正です: "${id}"（例: S01, S30）` });
      continue;
    }

    // [1] axis
    const axisRaw = fields[1];
    if (!VALID_AXES.has(axisRaw)) {
      errors.push({ row: rowNum, column: "axis", message: `軸が不正です: "${axisRaw}"（a1/a2/b/c/d）` });
      continue;
    }
    const axis = axisRaw as keyof AxisScores;

    // [2] name
    const name = fields[2];
    if (!name) {
      errors.push({ row: rowNum, column: "name", message: "ステップ名が空です" });
      continue;
    }
    if (name.length > MAX_NAME_LENGTH) {
      errors.push({ row: rowNum, column: "name", message: `ステップ名が長すぎます（${name.length}文字、上限${MAX_NAME_LENGTH}文字）` });
      continue;
    }

    // [3] description
    const description = fields[3] ?? "";
    if (!description) {
      errors.push({ row: rowNum, column: "description", message: "説明が空です" });
      continue;
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      errors.push({ row: rowNum, column: "description", message: `説明が長すぎます（${description.length}文字、上限${MAX_DESCRIPTION_LENGTH}文字）` });
      continue;
    }

    // [4] difficulty
    const difficultyNum = Number(fields[4]);
    if (!VALID_DIFFICULTIES.has(difficultyNum)) {
      errors.push({ row: rowNum, column: "difficulty", message: `難易度が不正です: "${fields[4]}"（1/2/3）` });
      continue;
    }
    const difficulty = difficultyNum as 1 | 2 | 3;

    // [5] estimatedMinutes
    const minutes = Number(fields[5]);
    if (!Number.isInteger(minutes) || minutes < MIN_MINUTES || minutes > MAX_MINUTES) {
      errors.push({ row: rowNum, column: "estimatedMinutes", message: `所要時間が不正です: "${fields[5]}"（${MIN_MINUTES}-${MAX_MINUTES}の整数）` });
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
// calculateStepDiff
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

  const importedIds = new Set<string>();
  const added: StepDefinition[] = [];
  const modified: StepModified[] = [];

  for (const imp of imported) {
    importedIds.add(imp.id);
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

  // existingにあってimportedにないもの
  const unchanged: StepDefinition[] = existing.filter(
    (s) => !importedIds.has(s.id) || (importedIds.has(s.id) && modified.every((m) => m.before.id !== s.id))
  ).filter((s) => !added.some((a) => a.id === s.id));

  return { added, modified, unchanged };
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
    return [...imported].sort((a, b) => a.id.localeCompare(b.id));
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

  return result.sort((a, b) => a.id.localeCompare(b.id));
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
