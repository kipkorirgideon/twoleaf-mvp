import { useState, type FormEvent } from 'react';
import { Alert, Badge, Button, Card, DataTable, IdTag, SelectField, type DataTableColumn, useToast } from '../../../design-system';
import { useMutation, useQuery } from '../../../api';
import { STAFF_ROLE_LABEL } from '../../../lib/labels';
import { formatDate, formatDateTime, formatKg, formatMonth, formatNumber, formatWhen } from '../../../lib/format';
import { DEMO_TODAY, addMonths, demoNow, monthKeyOf } from '../../../lib/time';
import { LoadError, PageHeader } from '../../../layouts/WebLayout';
import type { AccessLogView, AuditPack, CountyAuditRow, MonthKey, Uuid } from '../../../types';
import { HashText } from '../../../components/web/HashText';
import { useCountyShell } from '../CountyContext';
import { PrivacyNote } from '../components/PrivacyNote';

type PackRow = AuditPack & { factoryName: string };

const CHAIN_COLUMNS: DataTableColumn<CountyAuditRow>[] = [
  { key: 'factory', label: 'Factory', render: (r) => <span className="web-nowrap">{r.factory.name}</span> },
  { key: 'id', label: 'ID', render: (r) => <IdTag value={r.factory.readableId} copyable={false} /> },
  {
    key: 'chain',
    label: 'Chain',
    render: (r) =>
      r.chain.intact ? (
        <Badge tone="success">Intact</Badge>
      ) : (
        <Badge tone="danger">{r.chain.failedDate ? `Failed on ${formatDate(r.chain.failedDate)}` : 'Failed'}</Badge>
      ),
  },
  { key: 'verified', label: 'Last verified', render: (r) => <span className="web-nowrap">{`Verified ${formatWhen(r.chain.lastVerifiedAt, demoNow())}`}</span> },
  { key: 'days', label: 'Sealed days', align: 'right', render: (r) => formatNumber(r.chain.sealedDayCount) },
  { key: 'packs', label: 'Audit packs', align: 'right', render: (r) => formatNumber(r.packs.length) },
];

const PACK_COLUMNS: DataTableColumn<PackRow>[] = [
  { key: 'factory', label: 'Factory', render: (p) => <span className="web-nowrap">{p.factoryName}</span> },
  { key: 'ref', label: 'Reference', render: (p) => <IdTag value={p.reference} copyable={false} /> },
  { key: 'month', label: 'Month', render: (p) => <span className="web-nowrap">{formatMonth(p.month)}</span> },
  { key: 'count', label: 'Deliveries', align: 'right', render: (p) => formatNumber(p.deliveryCount) },
  { key: 'kg', label: 'Kilos', align: 'right', render: (p) => <span className="web-nowrap">{formatKg(p.totalKg)}</span> },
  { key: 'checksum', label: 'Checksum', render: (p) => <HashText hash={p.checksum} label="checksum" /> },
  {
    key: 'by',
    label: 'Prepared by',
    render: (p) => (
      <span className="web-cell-2">
        <span className="web-nowrap">{p.preparedByName}</span>
        <span className="text-muted body-sm web-nowrap">{formatDateTime(p.preparedAt)}</span>
      </span>
    ),
  },
  { key: 'status', label: 'Status', render: () => <Badge tone="success">Ready</Badge> },
];

const LOG_COLUMNS: DataTableColumn<AccessLogView>[] = [
  { key: 'at', label: 'When', render: (e) => <span className="web-nowrap">{formatDateTime(e.at)}</span> },
  {
    key: 'who',
    label: 'Who',
    render: (e) => (
      <span className="web-cell-2">
        <span className="web-nowrap">{e.actorName}</span>
        <span className="text-muted body-sm web-nowrap">{STAFF_ROLE_LABEL[e.actorRole]}</span>
      </span>
    ),
  },
  { key: 'action', label: 'Action', render: (e) => <Badge tone={e.action === 'export' ? 'warning' : 'neutral'}>{e.action[0].toUpperCase() + e.action.slice(1)}</Badge> },
  { key: 'what', label: 'What', render: (e) => e.description },
  { key: 'factory', label: 'Factory', render: (e) => (e.factoryName ? <span className="web-nowrap">{e.factoryName}</span> : <span className="text-muted">All factories</span>) },
];

/** Chain status per factory, audit packs (prepare new ones) and the access log. */
export function CountyAuditPage() {
  const { countyUuid } = useCountyShell();
  const toast = useToast();
  const q = useQuery((api) => api.getCountyAudit(countyUuid), [countyUuid]);
  const d = q.data;

  const currentMonth = monthKeyOf(DEMO_TODAY);
  const months: MonthKey[] = Array.from({ length: 6 }, (_, i) => addMonths(currentMonth, -i));
  const [factory, setFactory] = useState('');
  const [month, setMonth] = useState<MonthKey>(addMonths(currentMonth, -1));
  const [touched, setTouched] = useState(false);
  const prepare = useMutation((api, args: { factoryUuid: Uuid; month: MonthKey }) => api.prepareAuditPack(args.factoryUuid, args.month, 'county'));

  const factoryErr = touched && !factory ? 'Choose a factory.' : undefined;
  const intact = d ? d.factories.filter((f) => f.chain.intact).length : 0;

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setTouched(true);
    if (!factory) return;
    try {
      const pack = await prepare.run({ factoryUuid: factory as Uuid, month });
      toast.show(`Audit pack ${pack.reference} is ready`);
      setTouched(false);
    } catch {
      // shown inline
    }
  }

  return (
    <>
      <PageHeader title="Audit & reports" subtitle="Each factory seals every finished day with a hash chain. The county checks the chains and prepares audit packs." />
      {q.error && !d ? <LoadError title="Could not load audit status." message={q.error.message} onRetry={q.reload} /> : null}

      {d ? (
        intact === d.factories.length ? (
          <Alert tone="success" title="All chains intact">
            All {formatNumber(d.factories.length)} factories passed their last verification.
          </Alert>
        ) : (
          <Alert tone="danger" title={`${formatNumber(d.factories.length - intact)} of ${formatNumber(d.factories.length)} chains failed`}>
            A sealed day no longer matches the ledger. The factory must explain the change.
          </Alert>
        )
      ) : null}

      <section className="web-section" aria-labelledby="cty-a-chain">
        <h2 id="cty-a-chain" className="h3">
          Chain status by factory
        </h2>
        <DataTable caption="Chain status by factory" columns={CHAIN_COLUMNS} rows={d?.factories ?? []} loading={!d} loadingRows={6} rowKey={(r) => r.factory.uuid} emptyMessage="No factories yet." />
      </section>

      <section className="web-section" aria-labelledby="cty-a-packs">
        <h2 id="cty-a-packs" className="h3">
          Audit packs
        </h2>
        <Card>
          <form className="web-inline-form" onSubmit={(e) => void submit(e)} noValidate>
            <SelectField label="Factory" value={factory} onChange={(e) => setFactory(e.target.value)} error={factoryErr} disabled={!d}>
              <option value="">{d ? 'Choose a factory' : 'Loading…'}</option>
              {(d?.factories ?? []).map((f) => (
                <option key={f.factory.uuid} value={f.factory.uuid}>
                  {f.factory.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Month" value={month} onChange={(e) => setMonth(e.target.value as MonthKey)}>
              {months.map((m) => (
                <option key={m} value={m}>
                  {formatMonth(m)}
                  {m === currentMonth ? ' (to date)' : ''}
                </option>
              ))}
            </SelectField>
            <Button type="submit" icon="file" disabled={prepare.pending}>
              {prepare.pending ? 'Preparing…' : 'Prepare audit pack'}
            </Button>
          </form>
          {prepare.error ? (
            <Alert tone="danger" title="Pack not prepared">
              {prepare.error.message}
            </Alert>
          ) : null}
          <p className="body-sm text-muted web-mt">Downloads are disabled in this demo. Packs hold the factory's sealed ledger; farmer-level records stay with each factory.</p>
        </Card>
        <DataTable caption="Audit packs" columns={PACK_COLUMNS} rows={d?.packs ?? []} loading={!d} rowKey={(p) => p.uuid} emptyMessage="No audit packs prepared yet." />
      </section>

      <section className="web-section" aria-labelledby="cty-a-log">
        <h2 id="cty-a-log" className="h3">
          Access log
        </h2>
        <p className="body-sm text-muted">Who viewed or exported records, verified chains or prepared packs. Farmer references are removed at county level.</p>
        <DataTable caption="Access log" columns={LOG_COLUMNS} rows={d?.accessLog ?? []} loading={!d} rowKey={(e) => e.uuid} emptyMessage="No access recorded yet." />
      </section>

      <PrivacyNote />
    </>
  );
}
