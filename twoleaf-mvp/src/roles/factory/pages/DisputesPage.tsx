import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, DataTable, IdTag, QualityMeter, SelectField, StatCard, TextAreaField, type DataTableColumn, useToast, LeafIllustration } from '../../../design-system';
import { ApiError, useApi, useQuery } from '../../../api';
import { DISPUTE_REASON_LABEL, DISPUTE_STATUS_LABEL } from '../../../lib/labels';
import { formatAgeDays, formatDate, formatDateTime, formatKg, formatNumber } from '../../../lib/format';
import { demoNow } from '../../../lib/time';
import { LoadError, PageHeader } from '../../../layouts/WebLayout';
import type { DeliveryRow, DisputeDetail, DisputeRow, DisputeStatus } from '../../../types';
import { useFactoryShell } from '../FactoryContext';
import { DeadlineBadge, DeliveryStatusBadge, DisputeStatusBadge } from '../components/Badges';
import { CorrectionForm } from '../components/CorrectionForm';
import { useOpenDelivery } from '../components/DeliveryDrawer';
import { LedgerEntryLink } from '../components/LedgerEntryLink';
import { CardSkeleton, StatSkeletons, useUuidParam } from '../../../components/web/common';

const COLUMNS: DataTableColumn<DisputeRow>[] = [
  { key: 'id', label: 'Dispute ID', render: (r) => <IdTag value={r.readableId} copyable={false} /> },
  { key: 'farmer', label: 'Farmer', render: (r) => <span className="web-nowrap">{r.farmer.name}</span> },
  { key: 'ref', label: 'Centre / number', render: (r) => <span className="web-nowrap">{r.farmer.farmerRef}</span> },
  { key: 'reason', label: 'Reason', render: (r) => DISPUTE_REASON_LABEL[r.reason] },
  { key: 'opened', label: 'Opened', render: (r) => <span className="web-nowrap">{`${formatDate(r.openedAt)} (${formatAgeDays(r.openedAt, demoNow())})`}</span> },
  { key: 'deadline', label: 'Deadline', render: (r) => <DeadlineBadge dispute={r} /> },
  { key: 'status', label: 'Status', render: (r) => <DisputeStatusBadge status={r.status} /> },
];

const STATUSES: DisputeStatus[] = ['open', 'resolved_upheld', 'resolved_rejected'];

/** Dispute queue: problems reported by farmers, with a 7-day response deadline. */
export function DisputesPage() {
  const { factoryUuid } = useFactoryShell();
  const navigate = useNavigate();
  const [status, setStatus] = useState<DisputeStatus | ''>('open');
  const allQ = useQuery((api) => api.listDisputes({ factoryUuid }), [factoryUuid]);
  const all = allQ.data;
  const rows = all ? (status ? all.filter((r) => r.status === status) : all) : undefined;
  const open = all?.filter((r) => r.status === 'open') ?? [];

  return (
    <>
      <PageHeader title="Disputes" subtitle="Problems reported by farmers. Respond within 7 days of the report." />
      {allQ.error && !all ? <LoadError title="Could not load disputes." message={allQ.error.message} onRetry={allQ.reload} /> : null}
      <div className="web-stats">
        {!all ? (
          <StatSkeletons count={3} />
        ) : (
          <>
            <StatCard label="Open" value={formatNumber(open.length)} />
            <StatCard label="Due within 2 days" value={formatNumber(open.filter((r) => r.deadlineSoon || r.daysToDeadline < 0).length)} />
            <StatCard label="Resolved" value={formatNumber(all.length - open.length)} />
          </>
        )}
      </div>
      <div className="fac-filters">
        <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value as DisputeStatus | '')}>
          <option value="">All disputes</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {DISPUTE_STATUS_LABEL[s]}
            </option>
          ))}
        </SelectField>
      </div>
      <DataTable
        caption="Dispute queue"
        columns={COLUMNS}
        rows={rows ?? []}
        loading={!all && !allQ.error}
        rowKey={(r) => r.uuid}
        onRowClick={(r) => navigate(`/factory/disputes/${r.uuid}`)}
        emptyMessage={status === 'open' ? 'No open disputes. Every report has been answered.' : 'No disputes to show.'}
      />
    </>
  );
}

/** The entry a correction should target: the delivery itself, or its newest corrected entry. */
function correctionTarget(d: DisputeDetail): DeliveryRow | null {
  const del = d.delivery;
  if (!del) return null;
  if (del.status === 'synced') return del;
  if (del.status === 'corrected') {
    const live = del.corrections.filter((c) => c.status === 'synced');
    return live[live.length - 1] ?? null;
  }
  return null;
}

type Mode = 'none' | 'uphold' | 'reject';

function ResolvePanel({ dispute }: { dispute: DisputeDetail }) {
  const api = useApi();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>('none');
  const target = correctionTarget(dispute);
  const [withCorrection, setWithCorrection] = useState(target !== null);
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const noteRequired = mode === 'reject';
  const noteErr = noteRequired && note.trim().length < 5 ? 'A note is required when rejecting. Tell the farmer why (at least 5 characters).' : null;

  async function resolve(e: FormEvent): Promise<void> {
    e.preventDefault();
    setTouched(true);
    setError(null);
    if (noteErr) return;
    setSaving(true);
    try {
      await api.resolveDispute(dispute.uuid, {
        outcome: mode === 'reject' ? 'rejected' : 'upheld',
        note: note.trim() || 'Upheld. Thank you for reporting it.',
        correction: null,
      });
      toast.show('Dispute resolved');
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('validation', 'Could not resolve the dispute.'));
    } finally {
      setSaving(false);
    }
  }

  if (mode === 'none') {
    return (
      <Card titleLevel={2} title="Respond" subtitle={`Due ${formatDate(dispute.deadlineAt)}. The farmer sees your response in their app straight away.`}>
        <div className="fac-form-actions">
          <Button icon="check" onClick={() => setMode('uphold')}>
            Uphold
          </Button>
          <Button variant="secondary" icon="x" onClick={() => setMode('reject')}>
            Reject
          </Button>
        </div>
      </Card>
    );
  }

  if (mode === 'uphold' && withCorrection && target) {
    return (
      <Card titleLevel={2} title="Uphold with a correction" subtitle="Saving resolves the dispute and corrects the delivery in one step.">
        <div className="web-stack">
          <label className="fac-check">
            <input type="checkbox" checked={withCorrection} onChange={(e) => setWithCorrection(e.target.checked)} />
            Correct the delivery
          </label>
          <CorrectionForm
            delivery={target}
            allowMove={dispute.reason === 'wrong_farmer_number'}
            initialReason={`${DISPUTE_REASON_LABEL[dispute.reason]} (dispute ${dispute.readableId}).`}
            submitLabel="Uphold and save correction"
            onCancel={() => setMode('none')}
            onSubmit={async (v) => {
              await api.resolveDispute(dispute.uuid, {
                outcome: 'upheld',
                note: note.trim() || 'Upheld. Your delivery has been corrected.',
                correction: { deliveryUuid: target.uuid, kg: v.kg, reason: v.reason, membershipUuid: v.membershipUuid },
              });
              toast.show('Dispute resolved');
            }}
          >
            <TextAreaField
              label="Note to the farmer (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              hint="Shown in the farmer's app as the factory's response. The reason above stays on the ledger."
            />
          </CorrectionForm>
        </div>
      </Card>
    );
  }

  return (
    <Card titleLevel={2} title={mode === 'reject' ? 'Reject' : 'Uphold'} subtitle={mode === 'reject' ? 'Explain why. The farmer sees this note.' : 'Uphold without changing the ledger.'}>
      <form className="fac-form" onSubmit={(e) => void resolve(e)} noValidate>
        {mode === 'uphold' ? (
          target ? (
            <label className="fac-check">
              <input type="checkbox" checked={withCorrection} onChange={(e) => setWithCorrection(e.target.checked)} />
              Correct the delivery
            </label>
          ) : (
            <p className="body-sm text-muted">
              {dispute.delivery ? 'The linked delivery cannot be corrected from here (it is pending or a reversal).' : 'No delivery is linked to this report.'} To add a
              missing delivery, ask the clerk to record it.
            </p>
          )
        ) : null}
        <TextAreaField
          label={mode === 'reject' ? 'Note to the farmer (required)' : 'Note to the farmer (optional)'}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => setTouched(true)}
          error={(touched && noteErr) || (error?.field === 'note' ? error.message : undefined)}
          maxLength={500}
        />
        {error && error.field !== 'note' ? <Alert tone="danger" title="Not resolved">{error.message}</Alert> : null}
        <div className="fac-form-actions">
          <Button type="submit" variant={mode === 'reject' ? 'danger' : 'primary'} disabled={saving}>
            {saving ? 'Saving…' : mode === 'reject' ? 'Reject dispute' : 'Uphold dispute'}
          </Button>
          <Button variant="ghost" onClick={() => setMode('none')} disabled={saving}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** One dispute: farmer's note, linked delivery, and Uphold / Reject. */
export function DisputeDetailPage() {
  const { factoryUuid } = useFactoryShell();
  const disputeUuid = useUuidParam('disputeUuid');
  const open = useOpenDelivery();
  const q = useQuery((api) => (disputeUuid ? api.getDispute(factoryUuid, disputeUuid) : Promise.reject(new Error('Dispute not found.'))), [factoryUuid, disputeUuid], {
    enabled: disputeUuid !== null,
  });
  const d = q.data && q.data.uuid === disputeUuid ? q.data : undefined;

  if (!disputeUuid || (q.error && !d)) {
    return (
      <>
        <PageHeader title="Dispute" back={{ to: '/factory/disputes', label: 'Disputes' }} />
        <LoadError title="Could not load this dispute." message={q.error?.message ?? 'This dispute link is not valid.'} onRetry={disputeUuid ? q.reload : undefined} />
      </>
    );
  }

  const del = d?.delivery;

  return (
    <>
      <PageHeader
        title={d ? DISPUTE_REASON_LABEL[d.reason] : 'Dispute'}
        subtitle={d ? `${d.farmer.name} · ${d.farmer.farmerRef} · opened ${formatDateTime(d.openedAt)}` : 'Loading…'}
        back={{ to: '/factory/disputes', label: 'Disputes' }}
        meta={
          d ? (
            <>
              <IdTag value={d.readableId} />
              <DisputeStatusBadge status={d.status} />
              <DeadlineBadge dispute={d} />
            </>
          ) : null
        }
      />

      <div className="web-grid-2">
        <div className="web-stack">
          <Card titleLevel={2} title="Farmer's note">
            {!d ? (
              <CardSkeleton />
            ) : (
              <div className="web-stack-sm">
                <blockquote className="fac-quote">{d.farmerNote.trim() ? d.farmerNote : 'No note added.'}</blockquote>
                <p className="body-sm text-muted">
                  <Link to={`/factory/farmers/${d.farmer.uuid}`}>{d.farmer.name}</Link> · <IdTag value={d.farmer.readableId} copyable={false} />
                </p>
              </div>
            )}
          </Card>

          {d && d.resolution ? (
            <Card titleLevel={2} title={DISPUTE_STATUS_LABEL[d.status]} subtitle={`${d.resolution.byName}, ${formatDateTime(d.resolution.resolvedAt)}`}>
              <div className="web-stack-sm">
                <p className="body">{d.resolution.note}</p>
                {d.reversal || d.correctedDelivery ? (
                  <ul className="fac-linked">
                    {del ? <LedgerEntryLink label="Original" row={del} /> : null}
                    {d.reversal ? <LedgerEntryLink label="Reversal" row={d.reversal} /> : null}
                    {d.correctedDelivery ? <LedgerEntryLink label="Corrected entry" row={d.correctedDelivery} /> : null}
                  </ul>
                ) : null}
              </div>
            </Card>
          ) : null}

          {d && d.status === 'open' ? <ResolvePanel key={d.uuid} dispute={d} /> : null}
        </div>

        <Card titleLevel={2}
          title="Linked delivery"
          action={
            del ? (
              <Button variant="ghost" size="sm" onClick={() => open(del.uuid)}>
                Open in ledger
              </Button>
            ) : undefined
          }
        >
          {!d ? (
            <CardSkeleton lines={5} />
          ) : !del ? (
            <p className="body-sm text-muted">The farmer did not link a delivery. This is usual for “Delivery is missing”.</p>
          ) : (
            <div className="web-stack">
              <p className="fac-inline">
                <IdTag value={del.displayId} />
                <DeliveryStatusBadge status={del.status} />
              </p>
              <p className="body tl-num">
                {formatDateTime(del.recordedAt)} · <strong>{formatKg(del.kg)}</strong> · {del.centre.code} · scale <span className="mono">{del.scaleId}</span>
              </p>
              <LeafIllustration size="md" caption={del.photoRef} note="illustration, photos are not stored in this demo" />
              <QualityMeter value={del.fineLeafPct} target={60} label="Centre score" />
              {del.intakeFineLeafPct !== null ? <QualityMeter value={del.intakeFineLeafPct} target={60} label="Factory intake score" /> : null}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
