"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/contexts/ToastContext";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

// ===== 型定義 =====

type ToastType = "success" | "error" | "warning" | "info";

interface ToastStyleConfig {
  bg: string;
  border: string;
  iconColor: string;
}

interface ToastItemProps {
  id: string;
  type: ToastType;
  message: string;
  onRemove: (id: string) => void;
  duration: number;
}

// ===== 定数 =====

const STYLE_MAP: Record<ToastType, ToastStyleConfig> = {
  success: {
    bg: "#1a2e1a",
    border: "#22c55e",
    iconColor: "#22c55e",
  },
  error: {
    bg: "#2e1a1a",
    border: "#ef4444",
    iconColor: "#ef4444",
  },
  warning: {
    bg: "#2e2a1a",
    border: "#f59e0b",
    iconColor: "#f59e0b",
  },
  info: {
    bg: "#1a1a2e",
    border: "#3b82f6",
    iconColor: "#3b82f6",
  },
};

const ICON_MAP: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

// ===== アニメーション用の定数 =====

const SLIDE_IN_DURATION = 300;
const SLIDE_OUT_DURATION = 250;

// ===== 個別トーストアイテム =====

function ToastItem({ id, type, message, onRemove, duration }: ToastItemProps) {
  const [phase, setPhase] = useState<"entering" | "visible" | "exiting">("entering");

  useEffect(() => {
    // entering -> visible
    const enterTimer = setTimeout(() => {
      setPhase("visible");
    }, SLIDE_IN_DURATION);

    return () => clearTimeout(enterTimer);
  }, []);

  useEffect(() => {
    // visible -> exiting (自動消去前にアニメーション開始)
    const exitStartTime = duration - SLIDE_OUT_DURATION;
    if (exitStartTime <= 0) return;

    const exitTimer = setTimeout(() => {
      setPhase("exiting");
    }, exitStartTime);

    return () => clearTimeout(exitTimer);
  }, [duration]);

  const handleClose = useCallback(() => {
    setPhase("exiting");
    setTimeout(() => {
      onRemove(id);
    }, SLIDE_OUT_DURATION);
  }, [id, onRemove]);

  const style = STYLE_MAP[type];
  const IconComponent = ICON_MAP[type];

  const translateX =
    phase === "entering"
      ? "translateX(110%)"
      : phase === "exiting"
        ? "translateX(110%)"
        : "translateX(0)";

  const opacity = phase === "entering" ? 0 : phase === "exiting" ? 0 : 1;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        background: style.bg,
        borderLeft: `3px solid ${style.border}`,
        borderTop: `1px solid ${style.border}33`,
        borderRight: `1px solid ${style.border}33`,
        borderBottom: `1px solid ${style.border}33`,
        borderRadius: 0,
        color: "#f5f5f5",
        transform: translateX,
        opacity,
        transition: `transform ${SLIDE_IN_DURATION}ms ease-out, opacity ${SLIDE_IN_DURATION}ms ease-out`,
        maxWidth: "380px",
        minWidth: "280px",
        pointerEvents: "auto" as const,
      }}
      className="flex items-start gap-3 px-4 py-3"
    >
      <IconComponent
        size={18}
        color={style.iconColor}
        className="flex-shrink-0 mt-0.5"
      />
      <p className="flex-1 text-sm leading-snug" style={{ color: "#f5f5f5" }}>
        {message}
      </p>
      <button
        onClick={handleClose}
        className="flex-shrink-0 mt-0.5 hover:opacity-70 transition-opacity"
        aria-label="閉じる"
        type="button"
      >
        <X size={16} color="#f5f5f5" />
      </button>
    </div>
  );
}

// ===== トーストコンテナ =====

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="通知"
      style={{
        position: "fixed",
        top: "16px",
        right: "16px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          onRemove={removeToast}
          duration={toast.duration}
        />
      ))}
    </div>
  );
}
