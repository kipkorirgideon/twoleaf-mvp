import { useParams } from 'react-router-dom';
import { Card, Skeleton } from '../../design-system';
import { isUuid } from '../../lib/ids';
import type { Change, Uuid } from '../../types';

/** Skeleton stat cards while figures load. */
export function StatSkeletons({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="web-stat-skeleton">
          <Skeleton width="50%" />
          <Skeleton width="70%" height={32} />
        </Card>
      ))}
    </>
  );
}

/** Skeleton block for a card body. */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="web-stack-sm" aria-busy="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={`${90 - i * 12}%`} />
      ))}
    </div>
  );
}

/** Route param as a Uuid, or null when missing or not UUID-shaped. */
export function useUuidParam(name: string): Uuid | null {
  const params = useParams();
  const raw = params[name];
  return raw && isUuid(raw) ? raw : null;
}

/** Change → signed percent with one decimal, for StatCard's delta arrow. */
export function signedPct(change: Change): number {
  const pct = Math.round(Math.abs(change.pct) * 10) / 10;
  return change.direction === 'down' ? -pct : change.direction === 'flat' ? 0 : pct;
}
