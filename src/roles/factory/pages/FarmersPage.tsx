import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, DataTable, IdTag, SelectField, TextField, type DataTableColumn } from '../../../design-system';
import { useQuery } from '../../../api';
import { formatKg, formatPct, plural } from '../../../lib/format';
import { LoadError, PageHeader } from '../../../layouts/WebLayout';
import type { FactoryFarmerRow, Uuid } from '../../../types';
import { useFactoryShell } from '../FactoryContext';

const COLUMNS: DataTableColumn<FactoryFarmerRow>[] = [
  { key: 'name', label: 'Name', render: (r) => <span className="web-nowrap">{r.farmer.name}</span> },
  { key: 'id', label: 'TwoLeaf ID', render: (r) => <IdTag value={r.farmer.readableId} copyable={false} /> },
  { key: 'ref', label: 'Centre / number', render: (r) => <span className="web-nowrap">{r.farmer.farmerRef}</span> },
  { key: 'phone', label: 'Phone', render: (r) => <span className="web-nowrap tl-num">{r.phone}</span> },
  { key: 'kg', label: 'Kilos this month', align: 'right', render: (r) => <span className="web-nowrap">{formatKg(r.kgThisMonth)}</span> },
  { key: 'fine', label: 'Fine leaf', align: 'right', render: (r) => (r.fineLeafPct === null ? <span className="text-muted">No deliveries</span> : formatPct(r.fineLeafPct)) },
  {
    key: 'status',
    label: 'Status',
    render: (r) =>
      r.membershipStatus === 'suspended' ? (
        <Badge tone="danger">Suspended</Badge>
      ) : r.active ? (
        <Badge tone="success">Active</Badge>
      ) : (
        <Badge tone="neutral">Inactive 30 days</Badge>
      ),
  },
];

/** Farmers registered at this factory's centres (this factory's memberships only). */
export function FarmersPage() {
  const { factoryUuid } = useFactoryShell();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [centre, setCentre] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setTerm(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  const centresQ = useQuery((api) => api.listCentres(factoryUuid), [factoryUuid], { live: false });
  const q = useQuery(
    (api) => api.listFarmers({ factoryUuid, ...(centre ? { centreUuid: centre as Uuid } : {}), ...(term ? { search: term } : {}) }),
    [factoryUuid, centre, term],
  );

  return (
    <>
      <PageHeader
        title="Farmers"
        subtitle="Farmers registered at this factory's buying centres. Memberships at other factories are not shown."
        actions={
          <Button icon="plus" onClick={() => navigate('/factory/farmers/new')}>
            Register farmer
          </Button>
        }
      />

      <form className="fac-filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <TextField
          className="fac-filter-search"
          label="Search"
          type="search"
          placeholder="Name, TwoLeaf ID or TG-043 / 123"
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
      </form>

      {q.error && !q.data ? <LoadError title="Could not load farmers." message={q.error.message} onRetry={q.reload} /> : null}
      {q.data ? (
        <p className="body-sm text-muted" aria-live="polite">
          {plural(q.data.length, 'farmer number', 'farmer numbers')}
        </p>
      ) : null}

      <DataTable
        caption="Farmers"
        columns={COLUMNS}
        rows={q.data ?? []}
        loading={q.initialLoading}
        rowKey={(r) => r.farmer.membershipUuid}
        onRowClick={(r) => navigate(`/factory/farmers/${r.farmer.uuid}`)}
        emptyMessage={term || centre ? 'No farmers match. Try a farmer number like TG-043 / 123.' : 'No farmers registered yet.'}
      />
    </>
  );
}
