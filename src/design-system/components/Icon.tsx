import { cx } from '../cx';

/** Stroke icons drawn on a 24px grid, 1.8 stroke, `currentColor`. */
const PATHS = {
  home: ['M3 10.5 12 3l9 7.5', 'M5 9.5V21h14V9.5'],
  leaf: ['M12 21v-8', 'M12 13c-5 0-8-3-8-8 5 0 8 3 8 8z', 'M12 13c5 0 8-3 8-8-5 0-8 3-8 8z'],
  scale: ['M4 20h16', 'M6 20l2-12h8l2 12', 'M10 8V5a2 2 0 0 1 4 0v3'],
  users: ['M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M2 21a7 7 0 0 1 14 0', 'M16 3.5a4 4 0 0 1 0 7', 'M22 21a7 7 0 0 0-4-6.3'],
  chart: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2'],
  file: ['M14 3H6v18h12V7z', 'M14 3v4h4', 'M9 13h6', 'M9 17h6'],
  alert: ['M12 3 2 20h20z', 'M12 10v4', 'M12 17h.01'],
  check: ['M4 12l5 5L20 6'],
  info: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 11v6', 'M12 7h.01'],
  settings: [
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  ],
  sun: ['M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z', 'M12 1v2', 'M12 21v2', 'M4.2 4.2l1.4 1.4', 'M18.4 18.4l1.4 1.4', 'M1 12h2', 'M21 12h2', 'M4.2 19.8l1.4-1.4', 'M18.4 5.6l1.4-1.4'],
  moon: ['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'],
  copy: ['M9 9h11v11H9z', 'M5 15H4V4h11v1'],
  map: ['M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z', 'M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'],
  logout: ['M9 21H4V3h5', 'M16 17l5-5-5-5', 'M21 12H9'],

  // Added for the MVP (spec section 2), same grid and stroke.
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  x: ['M6 6l12 12', 'M18 6 6 18'],
  search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M21 21l-5-5'],
  plus: ['M12 5v14', 'M5 12h14'],
  camera: ['M3 8h4l2-3h6l2 3h4v12H3z', 'M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  qr: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M6.5 6.5h.01', 'M17.5 6.5h.01', 'M6.5 17.5h.01', 'M14 14h3v3h-3z', 'M21 14v.01', 'M14 21h.01', 'M17 21h4v-4'],
  wifi: ['M2 8.5a15 15 0 0 1 20 0', 'M5 12a10 10 0 0 1 14 0', 'M8.5 15.5a5 5 0 0 1 7 0', 'M12 19h.01'],
  'wifi-off': ['M2 2l20 20', 'M8.5 15.5a5 5 0 0 1 7 0', 'M5 12a10 10 0 0 1 5.2-2.7', 'M2 8.5a15 15 0 0 1 4.4-2.9', 'M14.5 9.3A10 10 0 0 1 19 12', 'M10.7 4.1A15 15 0 0 1 22 8.5', 'M12 19h.01'],
  refresh: ['M20 11a8 8 0 0 0-14.6-4.5L4 8', 'M4 3v5h5', 'M4 13a8 8 0 0 0 14.6 4.5L20 16', 'M20 21v-5h-5'],
  upload: ['M12 15V3', 'M7 8l5-5 5 5', 'M4 15v6h16v-6'],
  receipt: ['M5 3h14v18l-2.5-1.5L14 21l-2-1.5-2 1.5-2.5-1.5L5 21z', 'M9 8h6', 'M9 12h6', 'M9 16h4'],
  phone: ['M7 2h10v20H7z', 'M11 18h2'],
  lock: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4'],
  shield: ['M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', 'M9 12l2 2 4-4'],
  'arrow-left': ['M19 12H5', 'M11 6l-6 6 6 6'],
  'chevron-right': ['M9 6l6 6-6 6'],
  globe: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M2 12h20', 'M12 2a15 15 0 0 1 0 20', 'M12 2a15 15 0 0 0 0 20'],
  // Extra helpers in the same style (not in the spec list).
  'chevron-left': ['M15 6l-6 6 6 6'],
  'chevron-down': ['M6 9l6 6 6-6'],
  clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 7v5l3 2'],
  download: ['M12 3v12', 'M7 10l5 5 5-5', 'M4 15v6h16v-6'],
  calendar: ['M4 5h16v16H4z', 'M4 10h16', 'M8 3v4', 'M16 3v4'],
} satisfies Record<string, readonly string[]>;

export type IconName = keyof typeof PATHS;

/** Every icon name, in declaration order (used by the /design page). */
export const ICON_NAMES = Object.keys(PATHS) as IconName[];

export interface IconProps {
  name: IconName;
  size?: number | string;
  /** Accessible name. Without it the icon is decorative (`aria-hidden`). */
  label?: string;
  className?: string;
}

export function Icon({ name, size, label, className }: IconProps) {
  const d: readonly string[] = PATHS[name] ?? PATHS.leaf;
  return (
    <svg
      className={cx('tl-icon', className)}
      viewBox="0 0 24 24"
      aria-hidden={label ? undefined : 'true'}
      role={label ? 'img' : undefined}
      aria-label={label}
      style={size ? { width: size, height: size } : undefined}
    >
      {d.map((x, i) => (
        <path key={i} d={x} />
      ))}
    </svg>
  );
}
