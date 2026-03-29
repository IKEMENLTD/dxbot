'use client';

import { useState, useEffect, useCallback } from 'react';
import { PRECISION_QUESTIONS } from '@/lib/precision-interview';
import type { PrecisionQuestion } from '@/lib/precision-interview';
import { LEVEL_BAND_CONFIG, DEFAULT_ASSESSMENT_STYLE } from '@/lib/types';
import {
  INDUSTRIES,
  EMPLOYEE_COUNTS,
  ROLES,
  PAIN_POINTS,
  AXIS_DEEP_QUESTIONS,
  BUDGET_OPTIONS,
  DECISION_OPTIONS,
} from '@/lib/assessment-constants';
import { initLiff } from '@/lib/liff';
import type { LevelBand, AssessmentStyle, CompanyInfo } from '@/lib/types';

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

type FormStep = 'loading' | 'survey' | 'company_info' | 'profile' | 'submitting' | 'result' | 'error';

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
// ライトテーマ スタイル定数
// ---------------------------------------------------------------------------

const COLORS = {
  bg: '#FFFFFF',
  sectionBg: '#F9FAFB',
  border: '#E5E7EB',
  accent: '#06C755',
  accentHover: '#05B04C',
  accentLight: '#DCFCE7',
  text: '#111827',
  textMuted: '#6B7280',
  textDim: '#9CA3AF',
  error: '#EF4444',
  white: '#FFFFFF',
};

// ---------------------------------------------------------------------------
// dxbot ヘッダー
// ---------------------------------------------------------------------------

function DxbotHeader() {
  return (
    <header style={{
      padding: '12px 20px',
      borderBottom: `1px solid ${COLORS.border}`,
      background: COLORS.white,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
        <rect x="5" y="20" width="4.5" height="6" fill="#06C755" opacity="0.3"/>
        <rect x="11" y="15" width="4.5" height="11" fill="#06C755" opacity="0.5"/>
        <rect x="17" y="10" width="4.5" height="16" fill="#06C755" opacity="0.75"/>
        <rect x="23" y="5" width="4.5" height="21" fill="#06C755"/>
      </svg>
      <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>dxbot</span>
      <span style={{ fontSize: 11, color: COLORS.textDim, marginLeft: 8 }}>DXレベル無料診断</span>
    </header>
  );
}

// ---------------------------------------------------------------------------
// CompanyInfoStep コンポーネント
// ---------------------------------------------------------------------------

/** 診断結果の axisScores から最もスコアが低い軸を返す */
function getWeakAxis(scores: { a1: number; a2: number; b: number; c: number; d: number }): string {
  const entries = Object.entries(scores) as [string, number][];
  entries.sort((a, b) => a[1] - b[1]);
  return entries[0][0];
}

function CompanyInfoStep({ onNext, weakAxis }: {
  onNext: (data: CompanyInfo) => void;
  weakAxis: string;
}) {
  // STEP1
  const [challenges, setChallenges] = useState<string[]>([]);
  // STEP2
  const [painDetail, setPainDetail] = useState('');
  // STEP3
  const [budget, setBudget] = useState('');
  const [decisionAuthority, setDecisionAuthority] = useState('');
  // STEP4
  const [employeeCount, setEmployeeCount] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [freeText, setFreeText] = useState('');

  function toggleChallenge(c: string) {
    setChallenges((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onNext({
      employeeCount,
      role,
      challenges,
      painDetail,
      painAxis: weakAxis,
      budget,
      decisionAuthority,
      email: email.trim(),
      freeText: freeText.trim(),
    });
  }

  const deepQ = AXIS_DEEP_QUESTIONS[weakAxis] ?? AXIS_DEEP_QUESTIONS['a1'];

  const pillStyle = (selected: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    border: selected ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`,
    background: selected ? COLORS.accentLight : COLORS.white,
    color: selected ? COLORS.accent : COLORS.textMuted,
    borderRadius: 8,
  });

  const checkStyle = (selected: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    border: selected ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`,
    background: selected ? COLORS.accentLight : COLORS.white,
    color: selected ? COLORS.accent : COLORS.textMuted,
    borderRadius: 8,
    width: '100%',
    boxSizing: 'border-box' as const,
  });

  const sectionTitle: React.CSSProperties = {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 6,
    letterSpacing: '0.02em',
  };

  const sectionLabel: React.CSSProperties = {
    display: 'block',
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 10,
  };

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 20px' }}>
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* ===== STEP 1: 困りごと選択 ===== */}
          <div>
            <div style={sectionTitle}>STEP 1</div>
            <label style={sectionLabel}>今、困っていることはありますか？（複数選択可）</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PAIN_POINTS.map((p) => {
                const selected = challenges.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggleChallenge(p)}
                    style={checkStyle(selected)}
                  >
                    {selected ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                        <rect x="1" y="1" width="14" height="14" rx="3" fill={COLORS.accent} />
                        <path d="M4 8l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                        <rect x="1" y="1" width="14" height="14" rx="3" stroke={COLORS.border} strokeWidth="1.5" fill="none"/>
                      </svg>
                    )}
                    <span>{p}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ===== STEP 2: 弱軸深掘り ===== */}
          <div>
            <div style={sectionTitle}>STEP 2</div>
            <label style={sectionLabel}>{deepQ.question}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {deepQ.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setPainDetail(opt)}
                  style={checkStyle(painDetail === opt)}
                >
                  {painDetail === opt ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                      <circle cx="8" cy="8" r="7" stroke={COLORS.accent} strokeWidth="1.5" fill="none"/>
                      <circle cx="8" cy="8" r="4" fill={COLORS.accent}/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                      <circle cx="8" cy="8" r="7" stroke={COLORS.border} strokeWidth="1.5" fill="none"/>
                    </svg>
                  )}
                  <span>{opt}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ===== STEP 3: 導入意向 ===== */}
          <div>
            <div style={sectionTitle}>STEP 3</div>

            {/* Q1: 予算感 */}
            <label style={sectionLabel}>DXツールに月額いくらまで検討できますか？</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {BUDGET_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setBudget(opt)}
                  style={checkStyle(budget === opt)}
                >
                  {budget === opt ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                      <circle cx="8" cy="8" r="7" stroke={COLORS.accent} strokeWidth="1.5" fill="none"/>
                      <circle cx="8" cy="8" r="4" fill={COLORS.accent}/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                      <circle cx="8" cy="8" r="7" stroke={COLORS.border} strokeWidth="1.5" fill="none"/>
                    </svg>
                  )}
                  <span>{opt}</span>
                </button>
              ))}
            </div>

            {/* Q2: 決裁権 */}
            <label style={sectionLabel}>ITツールの導入を自分で決められますか？</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DECISION_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDecisionAuthority(opt)}
                  style={checkStyle(decisionAuthority === opt)}
                >
                  {decisionAuthority === opt ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                      <circle cx="8" cy="8" r="7" stroke={COLORS.accent} strokeWidth="1.5" fill="none"/>
                      <circle cx="8" cy="8" r="4" fill={COLORS.accent}/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                      <circle cx="8" cy="8" r="7" stroke={COLORS.border} strokeWidth="1.5" fill="none"/>
                    </svg>
                  )}
                  <span>{opt}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ===== STEP 4: 基本情報 + 自由記述 ===== */}
          <div>
            <div style={sectionTitle}>STEP 4</div>
            <label style={sectionLabel}>基本情報</label>

            {/* 従業員数 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>従業員数</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {EMPLOYEE_COUNTS.map((ec) => (
                  <button
                    key={ec}
                    type="button"
                    onClick={() => setEmployeeCount(ec)}
                    style={pillStyle(employeeCount === ec)}
                  >
                    {ec}
                  </button>
                ))}
              </div>
            </div>

            {/* 役職 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>役職</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    style={pillStyle(role === r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* メール */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
                メールアドレス <span style={{ fontWeight: 400 }}>（任意）</span>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@company.co.jp"
                style={{
                  width: '100%',
                  background: COLORS.white,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.text,
                  padding: '12px 14px',
                  fontSize: 15,
                  outline: 'none',
                  boxSizing: 'border-box',
                  borderRadius: 8,
                }}
              />
            </div>

            {/* 自由記述 */}
            <div>
              <div style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
                その他 <span style={{ fontWeight: 400 }}>（任意）</span>
              </div>
              <input
                type="text"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="その他、お困りのことがあれば"
                maxLength={200}
                style={{
                  width: '100%',
                  background: COLORS.white,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.text,
                  padding: '12px 14px',
                  fontSize: 15,
                  outline: 'none',
                  boxSizing: 'border-box',
                  borderRadius: 8,
                }}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          style={{
            marginTop: 32,
            width: '100%',
            background: COLORS.accent,
            color: COLORS.white,
            border: 'none',
            padding: '16px',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            borderRadius: 8,
          }}
        >
          送信する
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProfileStep コンポーネント
// ---------------------------------------------------------------------------

function ProfileStep({
  onNext,
  defaultName,
}: {
  onNext: (data: ProfileData) => void;
  defaultName: string;
}) {
  const [name, setName] = useState(defaultName);
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
    background: COLORS.white,
    border: `1px solid ${COLORS.border}`,
    color: COLORS.text,
    padding: '12px 14px',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    borderRadius: 8,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 6,
  };

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '40px 20px' }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, margin: 0, lineHeight: 1.3 }}>
          あと少しで結果が見られます
        </h1>
        <p style={{ color: COLORS.textMuted, marginTop: 10, fontSize: 14, lineHeight: 1.7 }}>
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
              style={{ ...inputStyle, borderColor: errors.name ? COLORS.error : COLORS.border }}
              maxLength={50}
            />
            {errors.name && (
              <p style={{ color: COLORS.error, fontSize: 12, marginTop: 4 }}>{errors.name}</p>
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
              style={{ ...inputStyle, borderColor: errors.company_name ? COLORS.error : COLORS.border }}
              maxLength={100}
            />
            {errors.company_name && (
              <p style={{ color: COLORS.error, fontSize: 12, marginTop: 4 }}>{errors.company_name}</p>
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
                borderColor: errors.industry ? COLORS.error : COLORS.border,
                cursor: 'pointer',
              }}
            >
              <option value="">選択してください</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
            {errors.industry && (
              <p style={{ color: COLORS.error, fontSize: 12, marginTop: 4 }}>{errors.industry}</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          style={{
            marginTop: 36,
            width: '100%',
            background: COLORS.accent,
            color: COLORS.white,
            border: 'none',
            padding: '16px',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            borderRadius: 8,
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
  style: _style,
}: {
  answers: number[];
  questions: PrecisionQuestion[];
  onAnswerChange: (answers: number[]) => void;
  onComplete: () => void;
  style: AssessmentStyle;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const [isAdvancing, setIsAdvancing] = useState(false);

  // style prop is kept for API compatibility but light theme uses fixed colors
  void _style;

  const questionCount = questions.length;
  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questionCount) * 100;
  const selected = answers[currentIndex];

  useEffect(() => {
    setFadeIn(false);
    const frameId = requestAnimationFrame(() => setFadeIn(true));
    return () => cancelAnimationFrame(frameId);
  }, [currentIndex]);

  const handleSelect = useCallback((value: number) => {
    if (isAdvancing) return; // 連打防止
    const next = [...answers];
    next[currentIndex] = value;
    onAnswerChange(next);
    setIsAdvancing(true);

    setTimeout(() => {
      if (currentIndex < questionCount - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        onComplete();
      }
      setIsAdvancing(false);
    }, 400);
  }, [answers, currentIndex, questionCount, onAnswerChange, onComplete, isAdvancing]);

  function handlePrev() {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }

  const scaleLabels = ['全くない', 'あまりない', 'どちらとも', 'ほぼできる', '十分できている'];

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px' }}>
      {/* プログレスバー */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: COLORS.textMuted, fontSize: 12 }}>
            質問 {currentIndex + 1} / {questionCount}
          </span>
          <span style={{ color: COLORS.accent, fontSize: 12, fontWeight: 600 }}>
            {Math.round(progress)}%
          </span>
        </div>
        <div style={{ background: COLORS.border, height: 3, width: '100%', borderRadius: 2 }}>
          <div
            style={{
              background: COLORS.accent,
              height: '100%',
              width: `${progress}%`,
              transition: 'width 0.3s ease',
              borderRadius: 2,
            }}
          />
        </div>
      </div>

      {/* フェードイン */}
      <div style={{ opacity: fadeIn ? 1 : 0, transition: 'opacity 0.2s ease' }}>
        {/* 軸ラベル */}
        <div style={{ marginBottom: 16 }}>
          <span
            style={{
              display: 'inline-block',
              background: '#ECFDF5',
              border: `1px solid ${COLORS.accent}`,
              color: COLORS.accent,
              fontSize: 11,
              padding: '3px 10px',
              borderRadius: 4,
              fontWeight: 600,
            }}
          >
            {AXIS_LABELS[question.axis]}
          </span>
        </div>

        {/* 設問 */}
        <p style={{ fontSize: 16, lineHeight: 1.8, color: COLORS.text, marginBottom: 28, fontWeight: 400 }}>
          {question.question}
        </p>

        {/* 5択ボタン */}
        <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'center', gap: 10 }}>
          {[1, 2, 3, 4, 5].map((v) => {
            const isSelected = selected === v;
            return (
              <button
                key={v}
                onClick={() => handleSelect(v)}
                disabled={isAdvancing}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isAdvancing ? 0.5 : 1,
                  width: 60,
                  minHeight: 56,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  border: isSelected ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`,
                  background: isSelected ? COLORS.accentLight : COLORS.white,
                  color: isSelected ? COLORS.accent : COLORS.textMuted,
                  borderRadius: 8,
                  padding: '6px 2px',
                }}
              >
                <span style={{ fontSize: 18, fontWeight: 700 }}>{v}</span>
                <span style={{ fontSize: 9, lineHeight: 1.2, textAlign: 'center', marginTop: 2 }}>{scaleLabels[v - 1]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 戻るボタン */}
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
            &#8592; 前の質問に戻る
          </button>
        )}
      </div>

      {/* モバイル対応CSS */}
      <style>{`
        @media (max-width: 480px) {
          .scale-gap { gap: 6px !important; }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ResultStep コンポーネント
// ---------------------------------------------------------------------------

function ResultStep({ result, lineUrl, assessmentId, onCompanyInfoSubmit }: {
  result: AssessmentResult;
  lineUrl: string | null;
  assessmentId: string | null;
  onCompanyInfoSubmit?: (data: CompanyInfo) => void;
}) {
  const weakAxis = getWeakAxis(result.axisScores);
  const bandConfig = LEVEL_BAND_CONFIG[result.levelBand];
  const maxAxisScore = 30;
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [companySaved, setCompanySaved] = useState(false);

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '40px 20px' }}>
      {/* レベル表示 */}
      <div
        style={{
          border: `1px solid ${COLORS.border}`,
          background: COLORS.sectionBg,
          padding: '40px 32px',
          textAlign: 'center',
          marginBottom: 32,
          borderRadius: 12,
        }}
      >
        <div style={{ color: COLORS.accent, fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', marginBottom: 8 }}>
          あなたのDXレベル
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, color: COLORS.text, lineHeight: 1 }}>
          {result.exactLevel}
        </div>
        <div style={{ color: COLORS.textMuted, fontSize: 14, marginTop: 8 }}>
          / 50
        </div>
        <div
          style={{
            display: 'inline-block',
            background: '#ECFDF5',
            color: COLORS.accent,
            fontSize: 13,
            fontWeight: 600,
            padding: '6px 16px',
            marginTop: 20,
            borderRadius: 8,
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
            fontSize: 14,
            fontWeight: 600,
            color: COLORS.text,
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
            <div style={{ background: COLORS.border, height: 6, borderRadius: 3 }}>
              <div
                style={{
                  background: COLORS.accent,
                  height: '100%',
                  width: `${(score / maxAxisScore) * 100}%`,
                  transition: 'width 0.5s ease',
                  borderRadius: 3,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 合計スコア */}
      <div
        style={{
          background: COLORS.sectionBg,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 8,
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 40,
        }}
      >
        <span style={{ color: COLORS.textMuted, fontSize: 13 }}>合計スコア</span>
        <span style={{ color: COLORS.text, fontSize: 20, fontWeight: 700 }}>
          {result.totalScore} <span style={{ color: COLORS.textDim, fontSize: 14 }}>/ 150</span>
        </span>
      </div>

      {/* LINE誘導CTA */}
      <div
        style={{
          background: COLORS.sectionBg,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          padding: '28px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ color: COLORS.accent, fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', marginBottom: 10 }}>
          次のステップ
        </div>
        <h3 style={{ color: COLORS.text, fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>
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
              background: COLORS.accent,
              color: COLORS.white,
              padding: '14px 32px',
              fontSize: 15,
              fontWeight: 700,
              textDecoration: 'none',
              borderRadius: 8,
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

      {/* 企業情報収集（結果を見せた後に任意で） */}
      {!companySaved && (
        <div style={{
          marginTop: 32,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          padding: '24px',
          background: COLORS.sectionBg,
        }}>
          {!showCompanyForm ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: COLORS.text, fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                より詳しい分析をお届けします
              </p>
              <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
                会社の規模や課題を教えていただくと、業種・規模に合わせた改善提案をお伝えできます。
              </p>
              <button
                onClick={() => setShowCompanyForm(true)}
                style={{
                  background: COLORS.white,
                  border: `1px solid ${COLORS.accent}`,
                  color: COLORS.accent,
                  padding: '10px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderRadius: 8,
                }}
              >
                会社情報を入力する（任意）
              </button>
            </div>
          ) : (
            <CompanyInfoStep
              weakAxis={weakAxis}
              onNext={(data) => {
                setCompanySaved(true);
                onCompanyInfoSubmit?.(data);
              }}
            />
          )}
        </div>
      )}
      {companySaved && (
        <p style={{ textAlign: 'center', color: COLORS.accent, fontSize: 13, marginTop: 16 }}>
          ご入力ありがとうございます。より詳しい分析をお届けします。
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// メインコンポーネント
// ---------------------------------------------------------------------------

export default function AssessmentPage() {
  const [step, setStep] = useState<FormStep>('loading');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [questions, setQuestions] = useState<PrecisionQuestion[]>(PRECISION_QUESTIONS);
  const [answers, setAnswers] = useState<number[]>(new Array(PRECISION_QUESTIONS.length).fill(0));
  const [lineUrl, setLineUrl] = useState<string | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [assessmentStyle, setAssessmentStyle] = useState<AssessmentStyle>(DEFAULT_ASSESSMENT_STYLE);
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [lineDisplayName, setLineDisplayName] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    // LIFF初期化
    initLiff().then((liffProfile) => {
      if (liffProfile) {
        setLineUserId(liffProfile.userId);
        setLineDisplayName(liffProfile.displayName);
      }
      setStep('survey');
    }).catch(() => {
      setStep('survey');
    });

    // config取得
    fetch('/api/assessment/config', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() as Promise<{ lineUrl: string | null; questions?: PrecisionQuestion[]; style?: AssessmentStyle }> : null))
      .then((data) => {
        if (data) {
          if (data.lineUrl) setLineUrl(data.lineUrl);
          if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
            setQuestions(data.questions);
            setAnswers(new Array(data.questions.length).fill(0));
          }
          if (data.style) setAssessmentStyle({ ...DEFAULT_ASSESSMENT_STYLE, ...data.style });
        }
      })
      .catch(() => { /* フォールバック */ });

    return () => controller.abort();
  }, []);

  // lint警告回避
  void profile;

  async function handleSubmit(completedAnswers: number[], profileData: ProfileData, ci: CompanyInfo | null) {
    setStep('submitting');
    setProfile(profileData);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profileData,
          answers: completedAnswers,
          line_user_id: lineUserId,
          company_info: ci,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? `エラー: ${res.status}`);
      }

      const json = await res.json() as { ok: boolean; result: AssessmentResult; id?: string };
      setResult(json.result);
      if (json.id) setAssessmentId(json.id);
      setStep('result');
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const msg = err instanceof Error ? err.message : '送信に失敗しました';
      setErrorMessage(msg);
      setStep('error');
    }
  }

  // ---------------------------------------------------------------------------
  // loading
  // ---------------------------------------------------------------------------
  if (step === 'loading') {
    return (
      <div>
        <DxbotHeader />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
          <div style={{ width: 32, height: 32, border: `3px solid ${COLORS.border}`, borderTopColor: COLORS.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: COLORS.textMuted, fontSize: 14 }}>読み込み中...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // survey
  // ---------------------------------------------------------------------------
  if (step === 'survey') {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg }}>
        <DxbotHeader />
        <SurveyStep
          answers={answers}
          questions={questions}
          onAnswerChange={setAnswers}
          onComplete={() => setStep('profile')}
          style={assessmentStyle}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // profile
  // ---------------------------------------------------------------------------
  if (step === 'profile') {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg }}>
        <DxbotHeader />
        <ProfileStep
          defaultName={lineDisplayName ?? ''}
          onNext={(data) => {
            setProfile(data);
            handleSubmit(answers, data, null);
          }}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // submitting
  // ---------------------------------------------------------------------------
  if (step === 'submitting') {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg }}>
        <DxbotHeader />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
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
                  borderRadius: '50%',
                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
          <p style={{ color: COLORS.textMuted, fontSize: 14 }}>スコアを計算中...</p>
          <style>{`@keyframes pulse { 0%,100%{opacity:0.2} 50%{opacity:1} }`}</style>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // result
  // ---------------------------------------------------------------------------
  if (step === 'result' && result) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg }}>
        <DxbotHeader />
        <ResultStep
          result={result}
          lineUrl={lineUrl}
          assessmentId={assessmentId}
          onCompanyInfoSubmit={async (data) => {
            if (!assessmentId) return;
            try {
              await fetch('/api/assessment/company-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assessmentId, companyInfo: data }),
              });
            } catch { /* 失敗しても結果は表示済み */ }
          }}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // error
  // ---------------------------------------------------------------------------
  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg }}>
      <DxbotHeader />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          flexDirection: 'column',
          gap: 20,
          padding: '0 20px',
        }}
      >
        <p style={{ color: COLORS.error, fontSize: 16 }}>{errorMessage || '送信に失敗しました'}</p>
        <button
          onClick={() => setStep('survey')}
          style={{
            background: COLORS.accent,
            border: 'none',
            color: COLORS.white,
            padding: '12px 24px',
            cursor: 'pointer',
            fontSize: 14,
            borderRadius: 8,
          }}
        >
          もう一度試す
        </button>
      </div>
    </div>
  );
}
