'use client';

import { useState, useEffect, useCallback } from 'react';
import { PRECISION_QUESTIONS } from '@/lib/precision-interview';
import type { PrecisionQuestion } from '@/lib/precision-interview';
import { LEVEL_BAND_CONFIG } from '@/lib/types';
import { INDUSTRIES } from '@/lib/assessment-constants';
import type { LevelBand } from '@/lib/types';

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

type FormStep = 'survey' | 'profile' | 'submitting' | 'result' | 'error';

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
  border: '#222',
  accent: '#3b82f6',
  accentDim: '#1d4ed8',
  text: '#e5e7eb',
  textMuted: '#9ca3af',
  textDim: '#6b7280',
};

// ---------------------------------------------------------------------------
// スケールカラーマップ（1-5 グラデーション）
// ---------------------------------------------------------------------------

const SCALE_COLORS = [
  { bg: '#1a0a0a', border: '#4a2020', text: '#ef4444' },  // 1: 暗い赤
  { bg: '#1a1008', border: '#4a3520', text: '#f59e0b' },  // 2: 暗いオレンジ
  { bg: '#0d0d0d', border: '#333',    text: '#9ca3af' },  // 3: ニュートラル
  { bg: '#081018', border: '#204060', text: '#60a5fa' },  // 4: 暗い青
  { bg: '#0a1628', border: '#1d4ed8', text: '#3b82f6' },  // 5: 青（アクセント）
];

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
          ALMOST DONE
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.3 }}>
          あと少しで結果が見られます
        </h1>
        <p style={{ color: COLORS.textMuted, marginTop: 12, fontSize: 14, lineHeight: 1.7 }}>
          診断結果の作成に以下の情報が必要です。
        </p>
      </div>

      {/* フォーム */}
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <label htmlFor="field-name" style={labelStyle}>氏名</label>
            <input
              id="field-name"
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
            <label htmlFor="field-company" style={labelStyle}>会社名</label>
            <input
              id="field-company"
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
            <label htmlFor="field-industry" style={labelStyle}>業種</label>
            <select
              id="field-industry"
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
          結果を見る
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
  answers,
  questions,
  onAnswerChange,
  onComplete,
}: {
  answers: number[];
  questions: PrecisionQuestion[];
  onAnswerChange: (answers: number[]) => void;
  onComplete: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  const questionCount = questions.length;
  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questionCount) * 100;
  const selected = answers[currentIndex];

  // 設問遷移フェードインアニメーション
  useEffect(() => {
    setFadeIn(false);
    const frameId = requestAnimationFrame(() => setFadeIn(true));
    return () => cancelAnimationFrame(frameId);
  }, [currentIndex]);

  const handleSelect = useCallback((value: number) => {
    const next = [...answers];
    next[currentIndex] = value;
    onAnswerChange(next);

    // auto-advance: 600msでアニメーション遷移を体感させる
    setTimeout(() => {
      if (currentIndex < questionCount - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        onComplete();
      }
    }, 600);
  }, [answers, currentIndex, questionCount, onAnswerChange, onComplete]);

  function handlePrev() {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px' }}>
      {/* プログレスバー */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: COLORS.textMuted, fontSize: 12, letterSpacing: '0.1em' }}>
            質問 {currentIndex + 1} / {questionCount}
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

      {/* フェードイン対象エリア */}
      <div style={{ opacity: fadeIn ? 1 : 0, transition: 'opacity 0.2s ease' }}>
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
        <p style={{ fontSize: 16, lineHeight: 1.8, color: '#fff', marginBottom: 28, fontWeight: 400 }}>
          {question.question}
        </p>

        {/* 横並び5択スケール */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right', minWidth: 48 }}>
              <span style={{ color: COLORS.textDim, fontSize: 12, display: 'block' }}>
                全くない
              </span>
              <span style={{ color: COLORS.textDim, fontSize: 10, display: 'block', marginTop: 2 }}>
                1
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[1, 2, 3, 4, 5].map((v) => {
                const isSelected = selected === v;
                const scaleColor = SCALE_COLORS[v - 1];
                return (
                  <div key={v} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <button
                      onClick={() => handleSelect(v)}
                      style={{
                        width: 52,
                        height: 52,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                        border: isSelected
                          ? `2px solid ${scaleColor.border}`
                          : '1px solid #222',
                        background: isSelected ? scaleColor.bg : '#111',
                        color: isSelected ? scaleColor.text : '#6b7280',
                      }}
                    >
                      {v}
                    </button>
                    {/* インジケーターバー */}
                    <div
                      style={{
                        width: 52,
                        height: 4,
                        marginTop: 4,
                        background: isSelected ? scaleColor.text : 'transparent',
                        transition: 'background 0.15s',
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign: 'left', minWidth: 48 }}>
              <span style={{ color: COLORS.textDim, fontSize: 12, display: 'block' }}>
                完璧
              </span>
              <span style={{ color: COLORS.textDim, fontSize: 10, display: 'block', marginTop: 2 }}>
                5
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ナビゲーション: 戻るボタンのみ */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 24 }}>
        {currentIndex > 0 && (
          <button
            onClick={handlePrev}
            style={{
              background: 'transparent',
              border: 'none',
              color: COLORS.textDim,
              padding: '8px 0',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            ← 前の質問に戻る
          </button>
        )}
      </div>

      {/* モバイル対応CSS */}
      <style>{`
        @media (max-width: 480px) {
          .scale-gap { gap: 6px !important; }
          .scale-label { font-size: 10px !important; }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ResultStep コンポーネント
// ---------------------------------------------------------------------------

function ResultStep({ result, lineUrl }: { result: AssessmentResult; lineUrl: string | null }) {
  const bandConfig = LEVEL_BAND_CONFIG[result.levelBand];
  const maxAxisScore = 30; // 6問 * 5点

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
        {lineUrl ? (
          <a
            href={lineUrl}
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
        ) : (
          <p style={{ color: COLORS.textDim, fontSize: 13 }}>
            LINE連携は準備中です。しばらくお待ちください。
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// メインコンポーネント
// ---------------------------------------------------------------------------

export default function AssessmentPage() {
  const [step, setStep] = useState<FormStep>('survey');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [questions, setQuestions] = useState<PrecisionQuestion[]>(PRECISION_QUESTIONS);
  const [answers, setAnswers] = useState<number[]>(new Array(PRECISION_QUESTIONS.length).fill(0));
  const [lineUrl, setLineUrl] = useState<string | null>(null);

  // 管理画面のLINE設定 + カスタム設問を取得
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/assessment/config', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() as Promise<{ lineUrl: string | null; questions?: PrecisionQuestion[] }> : null))
      .then((data) => {
        if (data) {
          if (data.lineUrl) setLineUrl(data.lineUrl);
          if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
            setQuestions(data.questions);
            setAnswers(new Array(data.questions.length).fill(0));
          }
        }
      })
      .catch(() => { /* フォールバック: デフォルト値のまま */ });
    return () => controller.abort();
  }, []);

  // profile は handleSurveyComplete で使われるがlinterの警告回避
  void profile;

  async function handleSurveyComplete(completedAnswers: number[], profileData: ProfileData) {
    setStep('submitting');
    setProfile(profileData);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profileData, answers: completedAnswers }),
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

  // survey → profile → submitting → result
  if (step === 'survey') {
    return (
      <SurveyStep
        answers={answers}
        questions={questions}
        onAnswerChange={setAnswers}
        onComplete={() => setStep('profile')}
      />
    );
  }

  if (step === 'profile') {
    return (
      <ProfileStep
        onNext={(data) => {
          setProfile(data);
          handleSurveyComplete(answers, data);
        }}
      />
    );
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 10,
                height: 10,
                background: COLORS.accent,
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
        <p style={{ color: COLORS.textMuted, fontSize: 14 }}>スコアを計算中...</p>
        <style>{`@keyframes pulse { 0%,100%{opacity:0.2} 50%{opacity:1} }`}</style>
      </div>
    );
  }

  if (step === 'result' && result) {
    return <ResultStep result={result} lineUrl={lineUrl} />;
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
