import { useEffect, useState } from 'react';
import { Button, SelectField, TextField } from '../../../design-system';
import { useQuery } from '../../../api';
import { DELIVERY_STATUS_LABEL } from '../../../lib/labels';
import { formatKg, plural } from '../../../lib/format';
import { LoadError, PageHeader } from '../../../layouts/WebLayout';
import type { DeliveryStatus, IsoDate, Uuid } from '../../../types';
import { useFactoryShell } from '../FactoryContext';
import { DeliveryTable } from '../components/DeliveryTable';

const STATUSES: DeliveryStatus[] = ['synced', 'pending', 'corrected', 'reversal'];
const PAGE = 100;

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** All deliveries at this factory's centres, with filters. Rows open the delivery drawer. */
export function DeliveriesPage() {
  const { factoryUuid } = useFactoryShell();
  const [centre, setCentre] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const term = useDebounced(search.trim(), 250);

  const rangeError = from && to && from > to ? 'The start date must be on or before the end date.' : undefined;

  useEffect(() => setLimit(PAGE), [centre, status, from, to, term]);

  const centresQ = useQuery((api) => api.listCentres(factoryUuid), [factoryUuid], { live: false });
  const q = useQuery(
    (api) =>
      api.listDeliveries({
        factoryUuid,
        ...(centre ? { centreUuid: centre as Uuid } : {}),
        ...(status ? { status: status as DeliveryStatus } : {}),
        ...(from ? { from: from as IsoDate } : {}),
        ...(to ? { to: to as IsoDate } : {}),
        ...(term ? { search: term } : {}),
      }),
    [factoryUuid, centre, status, from, to, term],
    { enabled: !rangeError },
  );

  const rows = q.data ?? [];
  const shown = rows.slice(0, limit);
  const netKg = rows.filter((r) => r.status !== 'pending').reduce((acc, r) => acc + r.kg, 0);
  const filtered = Boolean(centre || status || from || to || term);

  function clear(): void {
    setCentre('');
    setStatus('');
    setFrom('');
    setTo('');
    setSearch('');
  }

  return (
    <>
      <PageHeader title="Deliveries" subtitle="Every ledger entry at this factory's buying centres. Entries are never edited or deleted." />

      <form className="fac-filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <TextField
          className="fac-filter-search"
          label="Search"
          type="search"
          placeholder="Farmer name, ID or TG-043 / 123"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SelectField label="Buying centre" value={centre} onChange={(e) => setCentre(e.target.value)} disabled={!centresQ.data}>
          <option value="">All centres</option>
          {(centresQ.data ?? []).map((c) => (
            <option key={c.uuid} value={c.uuid}>
              {c.code} {c.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {DELIVERY_STATUS_LABEL[s]}
            </option>
          ))}
        </SelectField>
        <TextField label="From" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        <TextField label="To" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} error={rangeError} />
        {filtered ? (
          <div className="fac-filter-clear">
            <Button variant="ghost" size="sm" icon="x" onClick={clear}>
              Clear filters
            </Button>
          </div>
        ) : null}
      </form>

      {q.error && !q.data ? <LoadError title="Could not load deliveries." message={q.error.message} onRetry={q.reload} /> : null}

      {q.data && !rangeError ? (
        <p className="body-sm text-muted" aria-live="polite">
          {plural(rows.length, 'entry', 'entries')}
          {rows.length > 0 ? ` · net ${formatKg(netKg)} in the ledger (reversals subtract, pending entries are not yet counted)` : ''}
        </p>
      ) : null}

      <DeliveryTable
        caption="Deliveries"
        rows={rangeError ? [] : shown}
        loading={q.initialLoading}
        emptyMessage={rangeError ? 'Fix the dates to see deliveries.' : filtered ? 'No deliveries match these filters.' : 'No deliveries recorded yet.'}
      />

      {rows.length > shown.length && !rangeError ? (
        <div>
          <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>
            Show {Math.min(PAGE, rows.length - shown.length)} more
          </Button>
        </div>
      ) : null}
    </>
  );
}
