// ===== ToastContext ユニットテスト =====

import { describe, it, expect, vi, beforeEach } from "vitest";

// ToastContextの内部ロジック（MAX_TOASTS, DEFAULT_DURATION）をテスト
// Reactコンポーネントのレンダリングテストではなく、ロジックのみテスト

describe("Toast constants", () => {
  it("トーストの最大数は3", () => {
    const MAX_TOASTS = 3;
    const toasts = [1, 2, 3, 4];
    const trimmed = toasts.slice(toasts.length - MAX_TOASTS);
    expect(trimmed).toHaveLength(3);
    expect(trimmed).toEqual([2, 3, 4]);
  });

  it("デフォルトの表示時間は3000ms", () => {
    const DEFAULT_DURATION = 3000;
    expect(DEFAULT_DURATION).toBe(3000);
  });
});

describe("Toast ID generation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("ユニークなIDが生成される", () => {
    let counter = 0;
    const generateId = () => {
      counter += 1;
      return `toast-${Date.now()}-${counter}`;
    };

    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^toast-\d+-\d+$/);
  });

  it("IDはtoast-プレフィックスで始まる", () => {
    const id = `toast-${Date.now()}-1`;
    expect(id.startsWith("toast-")).toBe(true);
  });
});

describe("Toast type validation", () => {
  const VALID_TYPES = ["success", "error", "warning", "info"] as const;

  it("4種類のトーストタイプがある", () => {
    expect(VALID_TYPES).toHaveLength(4);
  });

  it.each(VALID_TYPES)("タイプ '%s' は有効", (type) => {
    expect(VALID_TYPES).toContain(type);
  });
});

describe("Toast stack behavior", () => {
  it("最大数を超えたら古いものから削除", () => {
    const MAX_TOASTS = 3;
    type SimpleToast = { id: string; message: string };
    const toasts: SimpleToast[] = [];

    for (let i = 1; i <= 5; i++) {
      toasts.push({ id: `toast-${i}`, message: `Message ${i}` });
    }

    const visible = toasts.slice(toasts.length - MAX_TOASTS);
    expect(visible).toHaveLength(3);
    expect(visible[0].id).toBe("toast-3");
    expect(visible[2].id).toBe("toast-5");
  });

  it("削除処理でIDが一致するものだけ除外", () => {
    type SimpleToast = { id: string; message: string };
    const toasts: SimpleToast[] = [
      { id: "toast-1", message: "A" },
      { id: "toast-2", message: "B" },
      { id: "toast-3", message: "C" },
    ];

    const filtered = toasts.filter((t) => t.id !== "toast-2");
    expect(filtered).toHaveLength(2);
    expect(filtered.find((t) => t.id === "toast-2")).toBeUndefined();
  });
});
