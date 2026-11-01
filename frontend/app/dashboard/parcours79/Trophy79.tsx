"use client";

/** Grand trophée doré de fin de leçon (« Mission accomplie ») : il brille et rebondit à l'apparition. */
export function Trophy79({ size = 150 }: { size?: number }) {
  return (
    <svg className="p79-trophy" width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id="p79-cup" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3a3" />
          <stop offset=".5" stopColor="#ffd23f" />
          <stop offset="1" stopColor="#f29d0a" />
        </linearGradient>
      </defs>
      <path d="M30 18c-14 0-20 6-20 16 0 12 10 22 24 24M90 18c14 0 20 6 20 16 0 12-10 22-24 24" fill="none" stroke="#b86e00" strokeWidth="6" strokeLinecap="round" />
      <path d="M30 14h60v26c0 18-13 30-30 30S30 58 30 40V14z" fill="url(#p79-cup)" stroke="#b86e00" strokeWidth="4" strokeLinejoin="round" />
      <path d="M60 28l4.600 9.500 10.400 1.500-7.500 7.300 1.800 10.300L60 51.500 50.700 56.600l1.800-10.300-7.500-7.300 10.400-1.500L60 28z" fill="#fff8d6" stroke="#b86e00" strokeWidth="2.500" strokeLinejoin="round" />
      <path d="M40 22v22" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".6" />
      <path d="M54 70h12v14H54z" fill="#e8a200" stroke="#b86e00" strokeWidth="4" strokeLinejoin="round" />
      <path d="M36 98h48l-5-14H41l-5 14z" fill="url(#p79-cup)" stroke="#b86e00" strokeWidth="4" strokeLinejoin="round" />
      <rect x="30" y="98" width="60" height="12" rx="4" fill="#153b3b" stroke="#0a2a2a" strokeWidth="3" />
    </svg>
  );
}
