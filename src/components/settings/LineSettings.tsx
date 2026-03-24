"use client";

import { useState, useEffect, useCallback } from "react";

// ===== 型定義 =====

/** サーバーから返却されるLINE設定の状態 */
interface LineConfigState {
  configured: boolean;
  maskedAccessToken: string | null;
  maskedSecret: string | null;
  webhookUrl: string | null;
  botName: string | null;
  verified: boolean;
  friendUrl: string | null;
}

interface TestResult {
  success: boolean;
  botName?: string;
  botId?: string;
  error?: string;
}

type ConnectionStatus = "unconfigured" | "unverified" | "connected";

// ===== 定数 =====

const WEBHOOK_PATH = "/api/webhook";

// ===== SVGアイコン =====

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
      <path d="M21 12a9 9 0 11-6.219-8.56" />
    </svg>
  );
}

// ===== ヘルパー =====

function getWebhookUrl(): string {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin;
  return `${origin}${WEBHOOK_PATH}`;
}

function getConnectionStatus(config: LineConfigState): ConnectionStatus {
  if (!config.configured) {
    return "unconfigured";
  }
  if (!config.verified) {
    return "unverified";
  }
  return "connected";
}

// ===== ステータスバッジ =====

function StatusBadge({ config }: { config: LineConfigState }) {
  const status = getConnectionStatus(config);

  switch (status) {
    case "unconfigured":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          未設定
        </span>
      );
    case "unverified":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-600">
          <span className="w-2 h-2 rounded-full bg-orange-400" />
          未検証
        </span>
      );
    case "connected":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          接続中 {config.botName ? `- ${config.botName}` : ""}
        </span>
      );
  }
}

// ===== ステップカード =====

interface StepCardProps {
  stepNumber: number;
  title: string;
  completed: boolean;
  onToggleComplete?: () => void;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function StepCard({
  stepNumber,
  title,
  completed,
  onToggleComplete,
  collapsible = true,
  defaultOpen = false,
  children,
}: StepCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div
        className={`flex items-center justify-between ${collapsible ? "cursor-pointer" : ""}`}
        onClick={collapsible ? () => setOpen(!open) : undefined}
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
              completed ? "bg-green-600 text-white" : "bg-gray-200 text-gray-600"
            }`}
          >
            {completed ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              stepNumber
            )}
          </span>
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="flex items-center gap-3">
          {onToggleComplete && (
            <label
              className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={completed}
                onChange={onToggleComplete}
                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              完了
            </label>
          )}
          {collapsible && (
            <span className="text-gray-400">
              <ChevronIcon open={open} />
            </span>
          )}
        </div>
      </div>

      {(!collapsible || open) && (
        <div className="mt-4 pl-10">{children}</div>
      )}
    </div>
  );
}

// ===== パスワード入力 =====

interface SecretInputProps {
  label: string;
  helpText: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maskedValue?: string | null;
}

function SecretInput({ label, helpText, value, onChange, placeholder, maskedValue }: SecretInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <p className="text-xs text-gray-500 mb-2">{helpText}</p>
      {maskedValue && !value && (
        <p className="text-xs text-green-600 mb-1">
          設定済み: {maskedValue}
        </p>
      )}
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={maskedValue && !value ? `設定済み（変更する場合は新しい値を入力）` : placeholder}
          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm text-gray-800 font-mono placeholder:text-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title={visible ? "非表示にする" : "表示する"}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}

// ===== メインコンポーネント =====

/** 保存APIレスポンスの型 */
interface SaveResponse {
  success: boolean;
  error?: string;
  maskedAccessToken?: string;
  maskedSecret?: string;
}

export default function LineSettings() {
  const [configState, setConfigState] = useState<LineConfigState>({
    configured: false,
    maskedAccessToken: null,
    maskedSecret: null,
    webhookUrl: null,
    botName: null,
    verified: false,
    friendUrl: null,
  });

  const [step1Done, setStep1Done] = useState(false);
  const [step2Done, setStep2Done] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [secretInput, setSecretInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [friendUrlCopied, setFriendUrlCopied] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 初期ロード: GET /api/settings/line からマスク値を取得
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    async function loadConfig() {
      try {
        const res = await fetch("/api/settings/line", {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = (await res.json()) as LineConfigState;
        setConfigState(data);
        setLoadError(null);
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof DOMException && err.name === "AbortError") {
          setLoadError("設定の読み込みがタイムアウトしました");
        } else {
          setLoadError(err instanceof Error ? err.message : "設定の読み込みに失敗しました");
        }
      } finally {
        setLoading(false);
        setWebhookUrl(getWebhookUrl());
      }
    }

    loadConfig();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  // 保存処理: POST /api/settings/line で暗号化保存
  const handleSave = useCallback(async () => {
    if (!tokenInput.trim() || !secretInput.trim()) return;

    setSaving(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const res = await fetch("/api/settings/line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelAccessToken: tokenInput.trim(),
          channelSecret: secretInput.trim(),
          webhookUrl: getWebhookUrl(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = (await res.json()) as SaveResponse;

      if (data.success) {
        setConfigState((prev) => ({
          ...prev,
          configured: true,
          maskedAccessToken: data.maskedAccessToken ?? prev.maskedAccessToken,
          maskedSecret: data.maskedSecret ?? prev.maskedSecret,
          verified: false,
          botName: null,
        }));
        // 入力をクリア（マスク表示に切り替え）
        setTokenInput("");
        setSecretInput("");
        setSaved(true);
        setTestResult(null);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setLoadError(data.error ?? "認証情報の保存に失敗しました");
      }
    } catch {
      setLoadError("認証情報の保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }, [tokenInput, secretInput]);

  // 接続テスト: POST /api/settings/line/test
  const handleTest = useCallback(async () => {
    if (!configState.configured && !tokenInput.trim()) return;

    setTesting(true);
    setTestResult(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      // 未保存のトークンがあればそれを送信、なければサーバーがDB設定を使用
      const bodyPayload: Record<string, string> = {};
      if (tokenInput.trim()) {
        bodyPayload.channelAccessToken = tokenInput.trim();
      }

      const res = await fetch("/api/settings/line/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = (await res.json()) as TestResult;
      setTestResult(data);

      if (data.success && data.botName) {
        // botIdからfriendUrlを生成
        let derivedFriendUrl: string | null = null;
        if (data.botId) {
          const normalizedId = data.botId.startsWith('@') ? data.botId : `@${data.botId}`;
          derivedFriendUrl = `https://line.me/R/ti/p/${normalizedId}`;
        }
        setConfigState((prev) => ({
          ...prev,
          verified: true,
          botName: data.botName ?? null,
          friendUrl: derivedFriendUrl ?? prev.friendUrl,
        }));
      }
    } catch {
      setTestResult({
        success: false,
        error: "接続テストに失敗しました。ネットワーク接続を確認してください。",
      });
    } finally {
      setTesting(false);
    }
  }, [configState.configured, tokenInput]);

  // クリップボードコピー
  const handleCopy = useCallback(async () => {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // フォールバック: selectとcopy
      const textarea = document.createElement("textarea");
      textarea.value = webhookUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [webhookUrl]);

  // 友だち追加URLコピー
  const handleCopyFriendUrl = useCallback(async () => {
    if (!configState.friendUrl) return;
    try {
      await navigator.clipboard.writeText(configState.friendUrl);
      setFriendUrlCopied(true);
      setTimeout(() => setFriendUrlCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = configState.friendUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setFriendUrlCopied(true);
      setTimeout(() => setFriendUrlCopied(false), 2000);
    }
  }, [configState.friendUrl]);

  const canSave = tokenInput.trim().length > 0 && secretInput.trim().length > 0;
  const canTest = configState.configured || tokenInput.trim().length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-400">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* エラー表示 */}
      {loadError && (
        <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700">
          {loadError}
        </div>
      )}

      {/* 接続ステータス */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">LINE Messaging API 連携</h2>
        <StatusBadge config={configState} />
      </div>

      {/* Step 1: LINE Developers登録 */}
      <StepCard
        stepNumber={1}
        title="Step 1: LINE Developersに登録"
        completed={step1Done}
        onToggleComplete={() => setStep1Done(!step1Done)}
        defaultOpen={!step1Done}
      >
        <div className="text-sm text-gray-600 space-y-3">
          <ol className="list-decimal list-inside space-y-2">
            <li>
              <a
                href="https://developers.line.biz/console/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:text-green-700 underline"
              >
                LINE Developers
              </a>
              {" "}にアクセス
            </li>
            <li>LINEアカウントでログイン</li>
            <li>プロバイダーを作成（例: 「TECHSTARS」）</li>
          </ol>
        </div>
      </StepCard>

      {/* Step 2: チャネル作成 */}
      <StepCard
        stepNumber={2}
        title="Step 2: Messaging APIチャネルを作成"
        completed={step2Done}
        onToggleComplete={() => setStep2Done(!step2Done)}
        defaultOpen={!step2Done}
      >
        <div className="text-sm text-gray-600 space-y-3">
          <ol className="list-decimal list-inside space-y-2">
            <li>プロバイダー内で「新規チャネル」から「Messaging API」を選択</li>
            <li>チャネル名を設定（例: 「DXBOT」）</li>
            <li>説明、アイコンを設定</li>
            <li>
              「応答設定」で応答モードを「Bot」に変更
              <br />
              <span className="text-xs text-gray-400 ml-4">
                ※{" "}
                <a
                  href="https://manager.line.biz/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:text-green-700 underline"
                >
                  LINE Official Account Manager
                </a>
                {" "}から変更できます
              </span>
            </li>
          </ol>
        </div>
      </StepCard>

      {/* Step 3: 認証情報入力 */}
      <StepCard
        stepNumber={3}
        title="Step 3: 認証情報を入力"
        completed={configState.configured}
        collapsible={false}
        defaultOpen
      >
        <div className="space-y-4">
          <SecretInput
            label="チャネルアクセストークン"
            helpText="Messaging API設定 → チャネルアクセストークン（長期）→ 「発行」をクリックしてコピー"
            value={tokenInput}
            onChange={setTokenInput}
            placeholder="トークンを貼り付け"
            maskedValue={configState.maskedAccessToken}
          />

          <SecretInput
            label="チャネルシークレット"
            helpText="チャネル基本設定 → チャネルシークレット"
            value={secretInput}
            onChange={setSecretInput}
            placeholder="シークレットを貼り付け"
            maskedValue={configState.maskedSecret}
          />

          {configState.configured && !tokenInput && !secretInput && (
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-xs text-green-700">
                認証情報は暗号化されてDBに保存済みです。変更する場合は新しい値を入力してください。
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || saving}
              className="bg-green-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "保存中..." : "保存"}
            </button>

            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircleIcon />
                暗号化して保存しました
              </span>
            )}
          </div>
        </div>
      </StepCard>

      {/* Step 4: Webhook URL設定 */}
      <StepCard
        stepNumber={4}
        title="Step 4: Webhook URLを設定"
        completed={false}
        collapsible
        defaultOpen={configState.configured}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 font-mono text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 select-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm px-3 py-2.5 rounded-lg transition-colors whitespace-nowrap"
              >
                {copied ? (
                  <>
                    <CheckCircleIcon />
                    コピーしました
                  </>
                ) : (
                  <>
                    <CopyIcon />
                    コピー
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <ol className="list-decimal list-inside space-y-2">
              <li>
                <a
                  href="https://developers.line.biz/console/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:text-green-700 underline"
                >
                  LINE Developers
                </a>
                {" "}の「Messaging API設定」を開く
              </li>
              <li>「Webhook URL」に上記URLを貼り付け</li>
              <li>「Webhookの利用」をONにする</li>
              <li>「検証」ボタンをクリックして接続確認</li>
            </ol>
          </div>

          <div className="bg-orange-50 rounded-xl p-3">
            <p className="text-xs text-orange-700">
              ※ Netlifyにデプロイ後に有効になります。ローカル開発時はngrok等のトンネルツールが必要です。
            </p>
          </div>
        </div>
      </StepCard>

      {/* Step 5: 接続テスト */}
      <StepCard
        stepNumber={5}
        title="Step 5: 接続テスト"
        completed={configState.verified}
        collapsible={false}
        defaultOpen
      >
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleTest}
            disabled={!canTest || testing}
            className="flex items-center gap-2 bg-green-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {testing && <LoadingSpinner />}
            {testing ? "テスト中..." : "接続テスト"}
          </button>

          {!canTest && (
            <p className="text-xs text-gray-400">
              先にStep 3で認証情報を保存してください。
            </p>
          )}

          {testResult && (
            testResult.success ? (
              <div className="bg-green-50 text-green-700 rounded-xl p-3 flex items-center gap-2">
                <CheckCircleIcon />
                <div>
                  <p className="text-sm font-medium">接続成功</p>
                  {testResult.botName && (
                    <p className="text-xs mt-0.5">Bot名: {testResult.botName}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-orange-50 text-orange-700 rounded-xl p-3">
                <p className="text-sm font-medium">接続失敗</p>
                {testResult.error && (
                  <p className="text-xs mt-0.5">{testResult.error}</p>
                )}
              </div>
            )
          )}

          {/* 友だち追加URL */}
          {configState.friendUrl && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <label className="block text-sm font-medium text-green-800 mb-2">
                LINE友だち追加URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={configState.friendUrl}
                  className="flex-1 font-mono text-sm bg-white border border-green-200 rounded-lg px-3 py-2.5 text-gray-700 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyFriendUrl}
                  className="flex items-center gap-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-sm px-3 py-2.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  {friendUrlCopied ? (
                    <>
                      <CheckCircleIcon />
                      コピーしました
                    </>
                  ) : (
                    <>
                      <CopyIcon />
                      コピー
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-green-600 mt-2">
                このURLを共有すると、ユーザーがLINE友だち追加できます。流入元管理でも自動的に使用されます。
              </p>
            </div>
          )}
        </div>
      </StepCard>
    </div>
  );
}
