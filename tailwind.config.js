/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans KR', 'Pretendard', 'sans-serif'],
      },
      /**
       * 시맨틱 색상 토큰. 실제 값은 index.css 의 CSS 변수(html.dark / html.light)가 결정한다.
       * 컴포넌트는 slate-900 같은 고정 색 대신 이 토큰만 사용해야 라이트/다크가 함께 동작한다.
       */
      colors: {
        // 주의: 색상 키 이름은 Tailwind 기본 유틸리티와 겹치면 안 된다.
        // 예전에 이 토큰 이름이 'base' 였는데, 그러면 글자 크기 유틸리티인 text-base 가
        // 색상 유틸리티로도 생성되어 본문 글자가 배경색으로 칠해지는 버그가 있었다.
        canvas: 'rgb(var(--c-base) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        elevated: 'rgb(var(--c-elevated) / <alpha-value>)',
        hover: 'rgb(var(--c-hover) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        'line-strong': 'rgb(var(--c-line-strong) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',
        scrim: 'rgb(var(--c-scrim) / <alpha-value>)',
        accent: {
          DEFAULT: 'rgb(var(--c-accent) / <alpha-value>)',
          strong: 'rgb(var(--c-accent-strong) / <alpha-value>)',
          soft: 'rgb(var(--c-accent-soft) / <alpha-value>)',
          text: 'rgb(var(--c-accent-text) / <alpha-value>)',
        },
      },
      animation: {
        'bounce-short': 'bounce 0.5s ease-in-out 1',
        'pulse-glow': 'pulseGlow 2s infinite',
        'pop': 'pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'wheel-spin': 'spin 3s cubic-bezier(0.15, 0.85, 0.35, 1.05)',
        'stamp': 'stamp 0.45s cubic-bezier(0.2, 1.4, 0.4, 1)',
        'rise': 'rise 0.35s ease-out both',
        'ripple': 'ripple 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.28s cubic-bezier(0.2, 1.2, 0.4, 1) both',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)' },
          '50%': { boxShadow: '0 0 25px rgba(16, 185, 129, 0.8)' },
        },
        pop: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        stamp: {
          '0%': { transform: 'scale(2.2) rotate(-18deg)', opacity: '0' },
          '55%': { transform: 'scale(0.88) rotate(4deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        rise: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.5' },
          '100%': { transform: 'scale(3.4)', opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(140%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      }
    },
  },
  plugins: [],
}
