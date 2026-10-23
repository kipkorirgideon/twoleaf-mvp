import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { cx } from '../cx';
import { Skeleton } from './Skeleton';

export interface DataTableColumn<R> {
  key: string;
  label: string;
  align?: 'left' | 'right';
  /** Custom cell. Without it the cell shows `row[key]`. */
  render?: (row: R) => ReactNode;
}

export interface DataTableProps<R> {
  columns: DataTableColumn<R>[];
  rows: R[];
  caption?: string;
  /** Makes rows clickable: pointer, hover, focusable, Enter or Space opens the row. */
  onRowClick?: (row: R) => void;
  /** React key per row. Defaults to `row.id`, then `row.uuid`, then the index (bundle.js used `id || index`). */
  rowKey?: (row: R, index: number) => string | number;
  /** Shows skeleton rows instead of `rows` while data loads. */
  loading?: boolean;
  /** Number of skeleton rows while loading. Default 5. */
  loadingRows?: number;
  /** Shown in a single full-width row when `rows` is empty (and not loading). Default "Nothing to show yet." */
  emptyMessage?: ReactNode;
}

function defaultKey(row: unknown, index: number): string | number {
  if (row && typeof row === 'object') {
    const r = row as Record<string, unknown>;
    for (const k of ['id', 'uuid']) {
      const v = r[k];
      if (typeof v === 'string' || typeof v === 'number') return v;
    }
  }
  return index;
}

function cellValue(row: unknown, key: string): ReactNode {
  if (!row || typeof row !== 'object') return null;
  const v = (row as Record<string, unknown>)[key];
  if (v == null || typeof v === 'boolean') return null;
  if (typeof v === 'string' || typeof v === 'number') return v;
  return String(v);
}

/** True when the event started on a control inside the row (e.g. an IdTag copy button). */
function fromInnerControl(e: MouseEvent<HTMLTableRowElement> | KeyboardEvent<HTMLTableRowElement>): boolean {
  const target = e.target as HTMLElement | null;
  if (!target || target === e.currentTarget) return false;
  const control = target.closest('button, a, input, select, textarea, label, [role="button"]');
  return control !== null && e.currentTarget.contains(control);
}

export function DataTable<R>({
  columns,
  rows,
  caption,
  onRowClick,
  rowKey = defaultKey,
  loading,
  loadingRows = 5,
  emptyMessage = 'Nothing to show yet.',
}: DataTableProps<R>) {
  const cols = columns || [];
  const list = rows || [];

  let body: ReactNode;
  if (loading) {
    body = Array.from({ length: loadingRows }, (_, i) => (
      <tr key={`sk-${i}`} className="tl-row-loading">
        {cols.map((c) => (
          <td key={c.key} className={c.align === 'right' ? 'tl-right' : undefined}>
            <Skeleton width={c.align === 'right' ? '60%' : '80%'} />
          </td>
        ))}
      </tr>
    ));
  } else if (list.length === 0) {
    body = (
      <tr className="tl-row-empty">
        <td colSpan={Math.max(cols.length, 1)}>{emptyMessage}</td>
      </tr>
    );
  } else {
    body = list.map((r, i) => {
      const clickable = Boolean(onRowClick);
      return (
        <tr
          key={rowKey(r, i)}
          className={clickable ? 'tl-row-click' : undefined}
          tabIndex={clickable ? 0 : undefined}
          onClick={
            clickable
              ? (e) => {
                  if (!fromInnerControl(e)) onRowClick?.(r);
                }
              : undefined
          }
          onKeyDown={
            clickable
              ? (e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRowClick?.(r);
                  }
                }
              : undefined
          }
        >
          {cols.map((c) => (
            <td key={c.key} className={c.align === 'right' ? 'tl-right' : undefined}>
              {c.render ? c.render(r) : cellValue(r, c.key)}
            </td>
          ))}
        </tr>
      );
    });
  }

  return (
    <div className="tl-table-wrap">
      <table className={cx('tl-table', onRowClick && 'tl-table-clickable')} aria-busy={loading ? 'true' : undefined}>
        {caption ? <caption className="tl-table-caption">{caption}</caption> : null}
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.key} scope="col" className={c.align === 'right' ? 'tl-right' : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{body}</tbody>
      </table>
    </div>
  );
}
