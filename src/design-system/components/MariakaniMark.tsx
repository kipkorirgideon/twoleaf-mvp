import { useId } from 'react';

/*
 * The Mariakani Labs mark. This is a logo, so its colours are fixed brand
 * values and the only hex colours allowed in the app (design system rule).
 */
export interface MariakaniMarkProps {
  /** Pixel size of the square mark. Default 20. */
  size?: number;
}

const RAIN: ReadonlyArray<readonly [number, number]> = [
  [28, 70], [46, 98], [22, 128], [40, 156], [60, 124], [150, 118], [168, 92], [176, 146],
  [156, 164], [186, 120], [74, 150], [132, 150], [96, 170], [118, 176], [58, 182], [142, 184],
];
const RAINC = ['#7FA8FF', '#5FE3FF', '#A99CFF'] as const;

export function MariakaniMark({ size = 20 }: MariakaniMarkProps) {
  // useId keeps gradient/clip ids unique per instance; colons stripped so url(#…) works everywhere.
  const u = 'mk' + useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <linearGradient id={u + 's'} x1={0} y1={0} x2={0} y2={1}>
          <stop offset={0} stopColor="#1A2766" />
          <stop offset={1} stopColor="#0A1035" />
        </linearGradient>
        <linearGradient id={u + 'b'} x1={0} y1={0} x2={0} y2={1}>
          <stop offset={0} stopColor="#EAF4FF" />
          <stop offset={0.55} stopColor="#5FE3FF" />
          <stop offset={1} stopColor="#A99CFF" />
        </linearGradient>
        <clipPath id={u + 'c'}>
          <rect width={200} height={200} rx={56} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${u}c)`}>
        <rect width={200} height={200} fill={`url(#${u}s)`} />
        <g strokeWidth={3} strokeLinecap="round" opacity={0.55}>
          {RAIN.map(([x, y], i) => (
            <line key={i} x1={x} y1={y} x2={x - 8} y2={y + 18} stroke={RAINC[i % 3]} />
          ))}
        </g>
        <path fill={`url(#${u}b)`} transform="translate(28,30) scale(0.72)" d="M118 34 L70 104 L98 104 L82 166 L138 92 L108 92 Z" />
        <g fill="#2D3C8E">
          <circle cx={72} cy={52} r={22} />
          <circle cx={100} cy={38} r={28} />
          <circle cx={130} cy={52} r={22} />
          <rect x={50} y={50} width={102} height={24} rx={12} />
        </g>
      </g>
    </svg>
  );
}
