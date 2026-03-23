"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

// ===== 型定義 =====

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

// ===== 定数 =====

const DEFAULT_DURATION = 3000;
const MAX_TOASTS = 3;

// ===== Context =====

const ToastContext = createContext<ToastContextValue | null>(null);

// ===== Provider =====

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, duration?: number) => {
      counterRef.current += 1;
      const id = `toast-${Date.now()}-${counterRef.current}`;
      const resolvedDuration = duration ?? DEFAULT_DURATION;

      const newToast: Toast = { id, type, message, duration: resolvedDuration };

      setToasts((prev) => {
        // 最大3つまで。超えたら古い方を削除
        const updated = [...prev, newToast];
        if (updated.length > MAX_TOASTS) {
          return updated.slice(updated.length - MAX_TOASTS);
        }
        return updated;
      });

      // 自動消去タイマー
      setTimeout(() => {
        removeToast(id);
      }, resolvedDuration);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

// ===== Hook =====

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
