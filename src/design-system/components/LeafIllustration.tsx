import { cx } from '../cx';

/*
 * Placeholder for the leaf sample photo: plucked tea shoots (two leaves and a
 * bud) with a few coarse leaves on a sample tray. Used in the factory delivery
 * drawer and dispute detail, the clerk record flow and the farmer delivery detail.
 * Colours come from tokens (see additions.css, `.tl-leaf-*`).
 */
export interface LeafIllustrationProps {
  /** Accessible name of the picture. Default "Leaf sample photo (illustration)". */
  label?: string;
  /** Short caption in the mono face, usually the photo reference (e.g. `IMG-TG043-20261023-0412`). */
  caption?: string;
  /** Plain-text note after the caption, e.g. "illustration, photos are not stored in this demo". */
  note?: string;
  /** Maximum width: `sm` 240px, `md` 360px, `full` the container (default). */
  size?: 'sm' | 'md' | 'full';
  className?: string;
}

/** One fine shoot (two leaves and a bud), drawn pointing up from (0, 0). */
function Shoot({ x, y, rotate, scale = 1 }: { x: number; y: number; rotate: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <path className="tl-leaf-stem" d="M0 34 C1 18 1 2 0 -30" />
      <path className="tl-leaf-fine" d="M0 -6 C-9 -9 -21 -18 -26 -34 C-12 -33 -3 -22 0 -6Z" />
      <path className="tl-leaf-rib" d="M0 -6 C-8 -14 -16 -24 -24 -32" />
      <path className="tl-leaf-fine" d="M0 10 C10 7 22 -2 28 -18 C14 -18 4 -8 0 10Z" />
      <path className="tl-leaf-rib" d="M0 10 C8 2 18 -8 26 -16" />
      <path className="tl-leaf-bud" d="M0 -28 C-5 -36 -4 -48 0 -56 C4 -48 5 -36 0 -28Z" />
    </g>
  );
}

/** A coarse (older, third) leaf. */
function Coarse({ x, y, rotate }: { x: number; y: number; rotate: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <path className="tl-leaf-coarse" d="M0 0 C-16 -6 -24 -26 -18 -52 C2 -40 8 -20 0 0Z" />
      <path className="tl-leaf-rib" d="M0 0 C-6 -16 -12 -32 -17 -50" />
    </g>
  );
}

export function LeafIllustration({ label = 'Leaf sample photo (illustration)', caption, note, size = 'full', className }: LeafIllustrationProps) {
  return (
    <figure className={cx('tl-leaf', `tl-leaf-${size}`, className)}>
      <svg viewBox="0 0 320 180" role="img" aria-label={label}>
        <rect className="tl-leaf-bg" x="0" y="0" width="320" height="180" rx="12" />
        <rect className="tl-leaf-tray" x="16" y="16" width="288" height="148" rx="10" />
        <Coarse x={70} y={150} rotate={-20} />
        <Coarse x={250} y={140} rotate={30} />
        <Shoot x={70} y={98} rotate={-14} />
        <Shoot x={128} y={110} rotate={8} scale={1.1} />
        <Shoot x={188} y={96} rotate={-6} />
        <Shoot x={246} y={104} rotate={18} scale={0.95} />
        <Shoot x={160} y={150} rotate={80} scale={0.8} />
      </svg>
      {caption || note ? (
        <figcaption className="tl-leaf-caption">
          {caption ? <span className="tl-leaf-ref">{caption}</span> : null}
          {caption && note ? ' · ' : null}
          {note ? <span>{note}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
