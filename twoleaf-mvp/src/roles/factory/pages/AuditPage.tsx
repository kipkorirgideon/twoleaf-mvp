import { useEffect, useRef, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, IdTag, SelectField, type DataTableColumn, useToast } from '../../../design-system';
import { useApi, useMutation, useQuery } from '../../../api';
import { STAFF_ROLE_LABEL } from '../../../lib/labels';
import { formatDate, formatDateTime, formatKg, formatMonth, formatNumber, formatWhen, plural } from '../../../lib/format';
import { DEMO_TODAY, addMonths, demoNow, monthKeyOf } from '../../../lib/time';
import { LoadError, PageHeader } from '../../../layouts/WebLayout';
import type { AccessLogView, AuditPack, ChainVerification, DayVerification, MonthKey, SealedDay } from '../../../types';
import { useFactoryShell } from '../FactoryContext';
import { HashText } from '../../../components/web/HashText';
import { CardSkeleton } from '../../../components/web/common';

const STEP_MS = 140;

interface VerifyRun {
  result: ChainVerification;
  /** Days checked so far (animates up to result.days.length). */
  checked: number;
}

function dayBadge(v: DayVerification | undefined, running: boolean) {
  if (!v) return running ? <Badge tone="neutral">Waiting</Badge> : <span className="text-muted">Not checked</span>;
  return v.ok ? <Badge tone="success">Intact</Badge> : <Badge tone="danger">Does not match</Badge>;
}

const PACK_COLUMNS: DataTableColumn<AuditPack>[] = [
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
  { key: 'farmer', label: 'Farmer ID', render: (e) => (e.farmerReadableId ? <IdTag value={e.farmerReadableId} copyable={false} /> : <span className="text-muted">–</span>) },
];

/** Audit: chain verification, demo tampering, sealed days, audit packs and the access log. */
export function AuditPage() {
  const { factoryUuid } = useFactoryShell();
  const api = useApi();
  const toast = useToast();
  const q = useQuery((a) => a.getAuditOverview(factoryUuid), [factoryUuid]);
  const d = q.data;

  const [run, setRun] = useState<VerifyRun | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearInterval(timer.current), []);

  const currentMonth = monthKeyOf(DEMO_TODAY);
  const monthOptions: MonthKey[] = Array.from({ length: 6 }, (_, i) => addMonths(currentMonth, -i));
  const [month, setMonth] = useState<MonthKey>(addMonths(currentMonth, -1));

  const tamper = useMutation((a) => a.simulateTampering(factoryUuid));
  const restore = useMutation((a) => a.restoreTampering(factoryUuid));
  const prepare = useMutation((a, m: MonthKey) => a.prepareAuditPack(factoryUuid, m));

  async function verify(): Promise<void> {
    window.clearInterval(timer.current);
    setVerifyError(null);
    setVerifying(true);
    setRun(null);
    try {
      const result = await api.verifyAuditChain(factoryUuid);
      setRun({ result, checked: 0 });
      timer.current = window.setInterval(() => {
        setRun((r) => (r ? { ...r, checked: Math.min(r.checked + 1, r.result.days.length) } : r));
      }, STEP_MS);
    } catch (e) {
      setVerifyError(e instanceof Error ? e.message : 'Could not verify the chain.');
      setVerifying(false);
    }
  }

  async function onTamper(): Promise<void> {
    try {
      await tamper.run(undefined);
      window.clearInterval(timer.current);
      setRun(null);
      setVerifying(false);
      toast.show('Tampering simulated. Run Verify chain to catch it.');
    } catch {
      // shown below
    }
  }

  async function onRestore(): Promise<void> {
    try {
      await restore.run(undefined);
      window.clearInterval(timer.current);
      setRun(null);
      setVerifying(false);
      toast.show('Original kilos restored');
    } catch {
      // shown below
    }
  }

  async function onPrepare(): Promise<void> {
    try {
      const pack = await prepare.run(month);
      toast.show(`Audit pack ${pack.reference} is ready`);
    } catch {
      // shown inline
    }
  }

  const done = run !== null && run.checked >= run.result.days.length;

  // Stop the progress animation once every day has been shown.
  useEffect(() => {
    if (done) {
      window.clearInterval(timer.current);
      setVerifying(false);
    }
  }, [done]);
  const checkedDays = run ? run.result.days.slice(0, run.checked) : [];
  const verByDate = new Map(checkedDays.map((v) => [v.date, v]));
  const current = run && !done ? run.result.days[run.checked] : undefined;
  const total = run?.result.days.length ?? d?.sealedDays.length ?? 0;
  const failure = done ? run.result.firstFailure : null;

  const sealedColumns: DataTableColumn<SealedDay>[] = [
    { key: 'date', label: 'Date', render: (s) => <span className="web-nowrap">{formatDate(s.date)}</span> },
    { key: 'count', label: 'Deliveries', align: 'right', render: (s) => formatNumber(s.count) },
    { key: 'kg', label: 'Kilos', align: 'right', render: (s) => <span className="web-nowrap">{formatKg(s.totalKg)}</span> },
    { key: 'prev', label: 'Previous hash', render: (s) => <HashText hash={s.prevHash} label="previous hash" /> },
    { key: 'hash', label: 'Hash', render: (s) => <HashText hash={s.hash} /> },
    { key: 'check', label: 'Check', render: (s) => dayBadge(verByDate.get(s.date), verifying) },
  ];

  return (
    <>
      <PageHeader title="Audit" subtitle="Each finished day is sealed with a hash that links to the day before. Verify recomputes every seal from the ledger." />
      {q.error && !d ? <LoadError title="Could not load the audit overview." message={q.error.message} onRetry={q.reload} /> : null}

      <div className="web-grid-2">
        <Card titleLevel={2}
          title="Chain status"
          subtitle={d ? `Last verified ${formatWhen(d.chain.lastVerifiedAt, demoNow())} · today (${formatDate(d.openDay)}) stays open until midnight` : undefined}
          action={
            <Button icon="shield" onClick={() => void verify()} disabled={!d || verifying}>
              {verifying ? 'Verifying…' : 'Verify chain'}
            </Button>
          }
        >
          {!d ? (
            <CardSkeleton />
          ) : (
            <div className="web-stack">
              {!run && !verifyError ? (
                d.chain.intact ? (
                  <Alert tone="success" title="Intact at the last check">
                    {formatNumber(d.chain.sealedDayCount)} sealed days matched their seals.
                  </Alert>
                ) : (
                  <Alert tone="danger" title="Failed at the last check">
                    {d.chain.failedDate ? `Day ${formatDate(d.chain.failedDate)} did not match its seal.` : 'A sealed day did not match.'}
                  </Alert>
                )
              ) : null}
              {run ? (
                <div className="web-stack-sm">
                  <div
                    className="fac-progress"
                    role="progressbar"
                    aria-label="Verifying sealed days"
                    aria-valuemin={0}
                    aria-valuemax={total}
                    aria-valuenow={run.checked}
                  >
                    <div className={failure ? 'fac-progress-fill fac-progress-fail' : 'fac-progress-fill'} style={{ width: `${total ? (run.checked / total) * 100 : 100}%` }} />
                  </div>
                  <p className="body-sm text-muted" aria-live="polite">
                    {current ? `Checking ${formatDate(current.date)} (${run.checked + 1} of ${total})…` : `Checked ${run.checked} of ${total} sealed days.`}
                  </p>
                </div>
              ) : null}
              {done && run ? (
                run.result.ok ? (
                  <Alert tone="success" title={run.result.message}>
                    Every sealed day matches the ledger. Verified {formatWhen(run.result.verifiedAt, demoNow())}.
                  </Alert>
                ) : failure ? (
                  <Alert tone="danger" title={`Day ${formatDate(failure.date)} does not match its seal`}>
                    Sealed: {plural(failure.expected.count, 'delivery', 'deliveries')}, {formatKg(failure.expected.totalKg)}. Found: {plural(failure.found.count, 'delivery', 'deliveries')}, {formatKg(failure.found.totalKg)}.
                    {failure.tamperedDeliveryIds.length > 0 ? ` Changed entry: ${failure.tamperedDeliveryIds.join(', ')}.` : ''}
                  </Alert>
                ) : (
                  <Alert tone="danger" title="Verification failed">{run.result.message}</Alert>
                )
              ) : null}
              {verifyError ? <LoadError title="Could not verify the chain." message={verifyError} onRetry={() => void verify()} /> : null}
            </div>
          )}
        </Card>

        <Card titleLevel={2} title="Demo only" subtitle="Shows what verification catches. A real ledger cannot be changed like this." className="fac-demo-box">
          <div className="web-stack">
            <p className="body-sm">
              <strong>Simulate tampering</strong> silently changes the kilos of one old delivery. <strong>Verify chain</strong> then fails on that day.{' '}
              <strong>Restore</strong> puts the original kilos back.
            </p>
            {d ? (
              <p>
                {d.tamperingActive ? <Badge tone="danger">Tampering active</Badge> : <Badge tone="success">Ledger as recorded</Badge>}
              </p>
            ) : null}
            <div className="fac-form-actions">
              <Button variant="danger" icon="alert" onClick={() => void onTamper()} disabled={!d || d.tamperingActive || tamper.pending || verifying}>
                {tamper.pending ? 'Changing…' : 'Simulate tampering'}
              </Button>
              <Button variant="secondary" icon="refresh" onClick={() => void onRestore()} disabled={!d || !d.tamperingActive || restore.pending || verifying}>
                {restore.pending ? 'Restoring…' : 'Restore'}
              </Button>
            </div>
            {tamper.error || restore.error ? <Alert tone="danger">{(tamper.error ?? restore.error)?.message}</Alert> : null}
          </div>
        </Card>
      </div>

      <section className="web-section" aria-labelledby="fac-audit-days">
        <div className="fac-section-head">
          <h2 id="fac-audit-days" className="h3">
            Sealed days
          </h2>
          {d ? <span className="body-sm text-muted">{plural(d.sealedDays.length, 'sealed day')}</span> : null}
        </div>
        {d ? <p className="body-sm text-muted">{d.scopeNote}</p> : null}
        <DataTable
          caption="Sealed days"
          columns={sealedColumns}
          rows={d ? [...d.sealedDays].reverse() : []}
          loading={!d}
          rowKey={(s) => s.uuid}
          emptyMessage="No sealed days yet."
        />
      </section>

      <section className="web-section" aria-labelledby="fac-audit-packs">
        <div className="fac-section-head">
          <h2 id="fac-audit-packs" className="h3">
            Audit packs
          </h2>
        </div>
        <Card>
          <div className="web-inline-form">
            <SelectField label="Month" value={month} onChange={(e) => setMonth(e.target.value as MonthKey)}>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {formatMonth(m)}
                  {m === currentMonth ? ' (to date)' : ''}
                </option>
              ))}
            </SelectField>
            <Button icon="file" onClick={() => void onPrepare()} disabled={prepare.pending}>
              {prepare.pending ? 'Preparing…' : 'Prepare audit pack'}
            </Button>
          </div>
          {prepare.error ? (
            <Alert tone="danger" title="Pack not prepared">
              {prepare.error.message}
            </Alert>
          ) : null}
          <p className="body-sm text-muted web-mt">Downloads are disabled in this demo. Each pack lists the month's ledger with a checksum auditors can recompute.</p>
        </Card>
        <DataTable caption="Audit packs" columns={PACK_COLUMNS} rows={d?.packs ?? []} loading={!d} rowKey={(p) => p.uuid} emptyMessage="No audit packs prepared yet." />
      </section>

      <section className="web-section" aria-labelledby="fac-audit-log">
        <h2 id="fac-audit-log" className="h3">
          Access log
        </h2>
        <p className="body-sm text-muted">Every view or export of farmer-level records by an auditor, plus verifications and prepared packs.</p>
        <DataTable caption="Access log" columns={LOG_COLUMNS} rows={d?.accessLog ?? []} loading={!d} rowKey={(e) => e.uuid} emptyMessage="No access recorded yet." />
      </section>
    </>
  );
}

