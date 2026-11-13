/**
 * "My QR card" for farmers and pluckers: name, IDs and a QR-style pattern drawn
 * from the ID hash. It is a demo pattern, labelled "Demo QR", not a scannable code.
 */
import { IdTag, twoleafIconUrl } from '../../design-system';
import { mulberry32 } from '../../lib/rng';
import { useT } from '../../lib/i18n';

const SIZE = 25;

function inFinder(x: number, y: number): boolean {
  const corner = (cx: number, cy: number): boolean => x >= cx && x < cx + 7 && y >= cy && y < cy + 7;
  return corner(0, 0) || corner(SIZE - 7, 0) || corner(0, SIZE - 7);
}

function finderDark(x: number, y: number): boolean {
  const lx = x >= SIZE - 7 ? x - (SIZE - 7) : x;
  const ly = y >= SIZE - 7 ? y - (SIZE - 7) : y;
  const ring = lx === 0 || lx === 6 || ly === 0 || ly === 6;
  const core = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4;
  return ring || core;
}

/** SVG path for the dark modules, deterministic for a given seed. */
function qrPath(seed: string): string {
  const rand = mulberry32(parseInt(seed.slice(0, 8), 16) || 1);
  let d = '';
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const quietAroundFinder = (x === 7 && (y < 8 || y >= SIZE - 8)) || (y === 7 && (x < 8 || x >= SIZE - 8)) || (x === SIZE - 8 && y < 8) || (y === SIZE - 8 && x < 8);
      let dark: boolean;
      if (inFinder(x, y)) dark = finderDark(x, y);
      else if (quietAroundFinder) dark = false;
      else if (y === 6) dark = x % 2 === 0;
      else if (x === 6) dark = y % 2 === 0;
      else dark = rand() < 0.5;
      if (dark) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  return d;
}

export interface QrCardProps {
  name: string;
  readableId: string;
  /** Extra lines, e.g. farmer numbers "TG-043 / 123". */
  refs?: string[];
  /** Hash of the readable ID (from the API), used as the pattern seed. */
  seed: string;
}

export function QrCard({ name, readableId, refs = [], seed }: QrCardProps) {
  const t = useT();
  return (
    <figure className="qr-card">
      <div className="qr-card-head">
        <img src={twoleafIconUrl} alt="" width={32} height={32} />
        <div>
          <p className="qr-card-name">{name}</p>
          <IdTag value={readableId} copyable={false} />
        </div>
      </div>
      <svg className="qr-card-code" viewBox={`-2 -2 ${SIZE + 4} ${SIZE + 4}`} role="img" aria-label={t('me.qrLabel', { name })} shapeRendering="crispEdges">
        <rect className="qr-bg" x={-2} y={-2} width={SIZE + 4} height={SIZE + 4} />
        <path className="qr-fg" d={qrPath(seed)} />
      </svg>
      {refs.length > 0 ? (
        <ul className="qr-card-refs">
          {refs.map((r) => (
            <li key={r} className="mono">
              {r}
            </li>
          ))}
        </ul>
      ) : null}
      <figcaption className="qr-card-caption">{t('common.demoQr')}</figcaption>
    </figure>
  );
}
