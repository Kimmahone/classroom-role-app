import React from 'react';

interface ProgressRingProps {
  /** 0 ~ 100 */
  value: number;
  size?: number;
  stroke?: number;
  /** 링 안에 넣을 내용 */
  children?: React.ReactNode;
  className?: string;
  /** 100% 일 때 무지개 그라디언트로 전환 */
  celebrate?: boolean;
}

/**
 * 완수율을 한눈에 보여주는 원형 게이지.
 * stroke-dashoffset 을 CSS 로 전이시켜 값이 바뀔 때 부드럽게 채워진다.
 */
export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  size = 132,
  stroke = 12,
  children,
  className = '',
  celebrate = false,
}) => {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const gradientId = celebrate ? 'ringGradCelebrate' : 'ringGrad';

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(var(--c-accent-soft))" />
            <stop offset="100%" stopColor="rgb(16 185 129)" />
          </linearGradient>
          <linearGradient id="ringGradCelebrate" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(245 158 11)" />
            <stop offset="50%" stopColor="rgb(16 185 129)" />
            <stop offset="100%" stopColor="rgb(var(--c-accent-soft))" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(var(--c-line-strong))"
          strokeWidth={stroke}
          opacity={0.5}
        />
        <circle
          className="ring-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
        {children}
      </div>
    </div>
  );
};
