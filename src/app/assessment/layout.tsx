import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DXレベル無料診断 | dxbot',
  description: '30問の設問に答えるだけで、あなたの会社のDX推進レベルを1〜50段階で測定します。所要時間約15分。無料。',
};

export default function AssessmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#111827' }}>
      {children}
    </div>
  );
}
