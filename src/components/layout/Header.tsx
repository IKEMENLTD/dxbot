"use client";

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <header className="h-16 bg-white/80 backdrop-blur-sm flex items-center justify-between px-8 sticky top-0 z-30">
      <div>
        <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </header>
  );
}
