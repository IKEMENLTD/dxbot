'use client';

import { useState } from 'react';
import { PRECISION_QUESTIONS, PRECISION_OPTIONS } from '@/lib/precision-interview';
import { LEVEL_BAND_CONFIG } from '@/lib/types';
import type { LevelBand } from '@/lib/types';

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

type FormStep = 'profile' | 'survey' | 'submitting' | 'result' | 'error';

interface ProfileData {
  name: string;
  company_name: string;
  industry: string;
}

interface AssessmentResult {
  exactLevel: number;
  axisScores: { a1: number; a2: number; b: number; c: number; d: number };
  totalScore: number;
  levelBand: LevelBand;
}

const INDUSTRIES = [
  '製造業', '建設業', '卸売業・小売業', '飲食・宿泊業', '医療・福祉',
  '情報通信業', '不動産業', '運輸業', '教育・学習支援', 'サービス業（他に分類されないもの）', 'その他',
];

const AXIS_LABELS: Record<string, string> = {
  a1: '売上・請求管理',
  a2: '連絡・記録管理',
  b: '繰り返し作業の自動化',
  c: 'データ経営',
  d: 'ITツール活用',
};

// ---------------------------------------------------------------------------
// スタイル定数
// ---------------------------------------------------------------------------

const COLORS = {
  bg: '#050505',
  surface: '#0d0d0d',
  border: '#222',
  borderActive: '#3b82f6',
  accent: '#3b82f6',
  accentDim: '#1d4ed8',
  text: '#e5e7eb',
  textMuted: '#9ca3af',
  textDim: '#6b7280',
};

// ---------------------------------------------------------------------------
// ProfileStep コンポーネント
// ---------------------------------------------------------------------------

function ProfileStep({
  onNext,
}: {
  onNext: (data: ProfileData) => void;
}) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [industry, setIndustry] = useState('');
  const [errors, setErrors] = useState<Partial<ProfileData>>({});

  function validate(): boolean {
    const errs: Partial<ProfileData> = {};
    if (!name.trim()) errs.name = '氏名を入力してください';
    else if (name.length > 50) errs.name = '50文字以内で入力してください';
    if (!company.trim()) errs.company_name = '会社名を入力してください';
    else if (company.length > 100) errs.company_name = '100文字以内で入力してください';
    if (!industry) errs.industry = '業種を選択してください';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) {
      onNext({ name: name.trim(), company_name: company.trim(), industry });
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#111',
    border: `1px solid ${COLORS.border}`,
    color: COLORS.text,
    padding: '12px 14px',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 6,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
  };

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '60px 20px' }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ color: COLORS.accent, fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
          DX LEVEL ASSESSMENT
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.3 }}>
          DXレベル無料診断
        </h1>
        <p style={{ color: COLORS.textMuted, marginTop: 16, fontSize: 14, lineHeight: 1.7 }}>
          30問の設問（約15分）であなたの会社のDX推進レベルをLv.1〜50で測定します。
          業種別の平均と比較したスコアレポートを即時表示します。
        </p>
      </div>

      {/* フォーム */}
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <label style={labelStyle}>氏名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="山田 太郎"
              style={{ ...inputStyle, borderColor: errors.name ? '#ef4444' : COLORS.border }}
              maxLength={50}
            />
            {errors.name && (
              <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.name}</p>
            )}
          </div>

          <div>
            <label style={labelStyle}>会社名</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="株式会社 〇〇"
              style={{ ...inputStyle, borderColor: errors.company_name ? '#ef4444' : COLORS.border }}
              maxLength={100}
            />
            {errors.company_name && (
              <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.company_name}</p>
            )}
          </div>

          <div>
            <label style={labelStyle}>業種</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              style={{
                ...inputStyle,
                borderColor: errors.industry ? '#ef4444' : COLORS.border,
                cursor: 'pointer',
              }}
            >
              <option value="">選択してください</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
            {errors.industry && (
              <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.industry}</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          style={{
            marginTop: 40,
            width: '100%',
            background: COLORS.accent,
            color: '#fff',
            border: 'none',
            padding: '16px',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '0.05em',
          }}
        >
          診断を開始する
        </button>

        <p style={{ color: COLORS.textDim, fontSize: 12, textAlign: 'center', marginTop: 16 }}>
          入力情報はDX診断の精度向上にのみ使用します
        </p>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SurveyStep コンポーネント
// ---------------------------------------------------------------------------

function SurveyStep({
  onComplete,
}: {
  onComplete: (answers: number[]) => void;
}) {
  const [answers, setAnswers] = useState<number[]>(new Array(30).fill(0));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState('');

  const question = PRECISION_QUESTIONS[currentIndex];
  const progress = ((currentIndex) / 30) * 100;
  const selected = answers[currentIndex];

  function handleSelect(value: number) {
    const next = [...answers];
    next[currentIndex] = value;
    setAnswers(next);
    setError('');
  }

  function handleNext() {
    if (selected === 0) {
      setError('選択肢を選んでください');
      return;
    }
    if (currentIndex < 29) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete(answers);
    }
  }

  function handlePrev() {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px' }}>
      {/* プログレスバー */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: COLORS.textMuted, fontSize: 12, letterSpacing: '0.1em' }}>
            質問 {currentIndex + 1} / 30
          </span>
          <span style={{ color: COLORS.accent, fontSize: 12, fontWeight: 600 }}>
            {Math.round(progress)}%
          </span>
        </div>
        <div style={{ background: '#1a1a1a', height: 3, width: '100%' }}>
          <div
            style={{
              background: COLORS.accent,
              height: '100%',
              width: `${progress}%`,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* 軸ラベル */}
      <div style={{ marginBottom: 16 }}>
        <span
          style={{
            display: 'inline-block',
            background: '#0a1628',
            border: `1px solid ${COLORS.accentDim}`,
            color: COLORS.accent,
            fontSize: 11,
            padding: '3px 10px',
            letterSpacing: '0.08em',
          }}
        >
          {AXIS_LABELS[question.axis]}
        </span>
      </div>

      {/* 設問 */}
      <p style={{ fontSize: 18, lineHeight: 1.7, color: '#fff', marginBottom: 32, fontWeight: 500 }}>
        {question.question}
      </p>

      {/* 5択ボタン */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {PRECISION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            style={{
              background: selected === opt.value ? '#0a1628' : '#111',
              border: `${selected === opt.value ? '2px' : '1px'} solid ${
                selected === opt.value ? COLORS.accent : COLORS.border
              }`,
              color: selected === opt.value ? COLORS.accent : COLORS.text,
              padding: '14px 18px',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: 1.4,
              transition: 'all 0.1s',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && (
        <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{error}</p>
      )}

      {/* ナビゲーション */}
      <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
        {currentIndex > 0 && (
          <button
            onClick={handlePrev}
            style={{
              background: 'transparent',
              border: `1px solid ${COLORS.border}`,
              color: COLORS.textMuted,
              padding: '12px 24px',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            戻る
          </button>
        )}
        <button
          onClick={handleNext}
          style={{
            flex: 1,
            background: COLORS.accent,
            border: 'none',
            color: '#fff',
            padding: '14px',
            cursor: 'pointer',
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: '0.05em',
          }}
        >
          {currentIndex < 29 ? '次へ' : '診断結果を見る'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ResultStep コンポーネント
// ---------------------------------------------------------------------------

function ResultStep({ result }: { result: AssessmentResult }) {
  const bandConfig = LEVEL_BAND_CONFIG[result.levelBand];
  const maxAxisScore = 30; // 6問 × 5点

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '60px 20px' }}>
      {/* レベル表示 */}
      <div
        style={{
          border: `1px solid ${COLORS.border}`,
          background: '#0d0d0d',
          padding: '40px 32px',
          textAlign: 'center',
          marginBottom: 32,
        }}
      >
        <div style={{ color: COLORS.accent, fontSize: 12, letterSpacing: '0.15em', marginBottom: 8 }}>
          YOUR DX LEVEL
        </div>
        <div style={{ fontSize: 72, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
          {result.exactLevel}
        </div>
        <div style={{ color: COLORS.textMuted, fontSize: 14, marginTop: 8 }}>
          / 50
        </div>
        <div
          style={{
            display: 'inline-block',
            background: '#0a1628',
            border: `1px solid ${COLORS.accentDim}`,
            color: COLORS.accent,
            fontSize: 13,
            padding: '6px 16px',
            marginTop: 20,
            letterSpacing: '0.05em',
          }}
        >
          {bandConfig.label} &nbsp;|&nbsp; {bandConfig.axisLabel}
        </div>
        <p style={{ color: COLORS.textMuted, fontSize: 14, marginTop: 20, lineHeight: 1.7 }}>
          {bandConfig.description}
        </p>
      </div>

      {/* 軸別スコア */}
      <div style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontSize: 12,
            letterSpacing: '0.15em',
            color: COLORS.textMuted,
            textTransform: 'uppercase',
            marginBottom: 20,
          }}
        >
          軸別スコア（各軸 最大30点）
        </h2>
        {(Object.entries(result.axisScores) as [string, number][]).map(([axis, score]) => (
          <div key={axis} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: COLORS.text, fontSize: 13 }}>
                {AXIS_LABELS[axis] ?? axis}
              </span>
              <span style={{ color: COLORS.accent, fontSize: 13, fontWeight: 600 }}>
                {score} / {maxAxisScore}
              </span>
            </div>
            <div style={{ background: '#1a1a1a', height: 6 }}>
              <div
                style={{
                  background: COLORS.accent,
                  height: '100%',
                  width: `${(score / maxAxisScore) * 100}%`,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 合計スコア */}
      <div
        style={{
          background: '#0d0d0d',
          border: `1px solid ${COLORS.border}`,
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 40,
        }}
      >
        <span style={{ color: COLORS.textMuted, fontSize: 13 }}>合計スコア</span>
        <span style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>
          {result.totalScore} <span style={{ color: COLORS.textDim, fontSize: 14 }}>/ 150</span>
        </span>
      </div>

      {/* LINE誘導CTA */}
      <div
        style={{
          background: '#0a1628',
          border: `1px solid ${COLORS.accentDim}`,
          padding: '28px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ color: COLORS.accent, fontSize: 12, letterSpacing: '0.1em', marginBottom: 10 }}>
          NEXT STEP
        </div>
        <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>
          あなたのDXレベルに合わせた改善ステップを受け取る
        </h3>
        <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
          LINEで友達追加すると、今のレベルから次のステップへ進むための
          具体的なアクションを毎日お届けします。
        </p>
        <a
          href="https://lin.ee/your-line-id"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            background: '#06c755',
            color: '#fff',
            padding: '14px 32px',
            fontSize: 15,
            fontWeight: 700,
            textDecoration: 'none',
            letterSpacing: '0.05em',
          }}
        >
          LINE で改善ステップを受け取る
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// メインコンポーネント
// ---------------------------------------------------------------------------

export default function AssessmentPage() {
  const [step, setStep] = useState<FormStep>('profile');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSurveyComplete(answers: number[]) {
    if (!profile) return;
    setStep('submitting');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, answers }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? `エラー: ${res.status}`);
      }

      const json = await res.json() as { ok: boolean; result: AssessmentResult };
      setResult(json.result);
      setStep('result');
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const msg = err instanceof Error ? err.message : '送信に失敗しました';
      setErrorMessage(msg);
      setStep('error');
    }
  }

  if (step === 'profile') {
    return (
      <ProfileStep
        onNext={(data) => {
          setProfile(data);
          setStep('survey');
        }}
      />
    );
  }

  if (step === 'survey') {
    return <SurveyStep onComplete={handleSurveyComplete} />;
  }

  if (step === 'submitting') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: `3px solid ${COLORS.border}`,
            borderTopColor: COLORS.accent,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ color: COLORS.textMuted, fontSize: 14 }}>スコアを計算中...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (step === 'result' && result) {
    return <ResultStep result={result} />;
  }

  // error
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 20,
        padding: '0 20px',
      }}
    >
      <p style={{ color: '#ef4444', fontSize: 16 }}>{errorMessage || '送信に失敗しました'}</p>
      <button
        onClick={() => setStep('survey')}
        style={{
          background: COLORS.accent,
          border: 'none',
          color: '#fff',
          padding: '12px 24px',
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        もう一度試す
      </button>
    </div>
  );
}
