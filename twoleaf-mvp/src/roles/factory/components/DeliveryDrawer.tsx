import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Badge, Button, IdTag, QualityMeter, Skeleton, useToast, LeafIllustration } from '../../../design-system';
import { useApi, useQuery, type CorrectDeliveryResponse } from '../../../api';
import { formatDateTime, formatKg, formatPct, formatPts } from '../../../lib/format';
import { isUuid } from '../../../lib/ids';
import type { DeliveryDetail, Uuid } from '../../../types';
import { LoadError } from '../../../layouts/WebLayout';
import { useFactoryShell } from '../FactoryContext';
import { DeliveryStatusBadge } from './Badges';
import { CorrectionForm } from './CorrectionForm';
import { Drawer } from './Drawer';
import { LedgerEntryLink } from './LedgerEntryLink';
import { HashText } from '../../../components/web/HashText';

const PARAM = 'delivery';

/** Opens the delivery drawer on top of the current page (`?delivery=<uuid>`). */
export function useOpenDelivery(): (uuid: Uuid) => void {
  const [, setParams] = useSearchParams();
  return useCallback(
    (uuid: Uuid) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set(PARAM, uuid);
        return next;
      }),
    [setParams],
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="fac-dl-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function correctionBlocker(d: DeliveryDetail): string | null {
  switch (d.status) {
    case 'pending':
      return 'This delivery is waiting to sync from the buying centre. Sync it before correcting it.';
    case 'corrected':
      return 'This delivery has already been corrected. Correct the newest entry instead.';
    case 'reversal':
      return 'Reversal entries cannot be corrected.';
    case 'synced':
      return null;
    default: {
      const never: never = d.status;
      return String(never);
    }
  }
}

function DeliveryBody({ detail, onOpen }: { detail: DeliveryDetail; onOpen: (uuid: Uuid) => void }) {
  const api = useApi();
  const toast = useToast();
  const [correcting, setCorrecting] = useState(false);
  const [saved, setSaved] = useState<CorrectDeliveryResponse | null>(null);

  useEffect(() => {
    setCorrecting(false);
    setSaved(null);
  }, [detail.uuid]);

  const blocker = correctionBlocker(detail);
  const gap = detail.intakeFineLeafPct === null ? null : Math.round((detail.fineLeafPct - detail.intakeFineLeafPct) * 10) / 10;
  const note = detail.correction;

  return (
    <div className="fac-drawer-stack">
      {detail.status === 'corrected' ? (
        <Alert tone="info" title="Original entry, corrected">
          This entry stays in the ledger. A reversal cancels it and a corrected entry replaces it.
        </Alert>
      ) : null}
      {detail.status === 'reversal' ? (
        <Alert tone="info" title="Reversal entry">
          Cancels {detail.original ? detail.original.displayId : 'the original entry'} with negative kilos.
        </Alert>
      ) : null}
      {!detail.hashValid ? (
        <Alert tone="danger" title="Does not match its hash">
          This entry was changed after it was recorded. The sealed day it belongs to will fail verification.
        </Alert>
      ) : null}
      {note ? (
        <p className="body-sm">
          <strong>Correction reason:</strong> {note.reason} · {note.byName}, {formatDateTime(note.at)}
          {note.disputeUuid ? (
            <>
              {' · '}
              <Link to={`/factory/disputes/${note.disputeUuid}`}>Open the dispute</Link>
            </>
          ) : null}
        </p>
      ) : null}

      {saved ? (
        <Alert tone="success" title="Correction saved">
          Added reversal {saved.reversal.displayId} ({formatKg(saved.reversal.kg)}) and corrected entry {saved.corrected.displayId} (
          {formatKg(saved.corrected.kg)}).
        </Alert>
      ) : null}

      {detail.original || detail.reversals.length > 0 || detail.corrections.length > 0 ? (
        <section aria-labelledby="fac-linked-title">
          <h3 id="fac-linked-title" className="fac-section-title">
            Linked entries
          </h3>
          <ul className="fac-linked">
            {detail.original ? <LedgerEntryLink row={detail.original} onOpen={onOpen} label="Original" /> : null}
            {detail.reversals.map((r) => (
              <LedgerEntryLink key={r.uuid} row={r} onOpen={onOpen} label="Reversal" />
            ))}
            {detail.corrections.map((r) => (
              <LedgerEntryLink key={r.uuid} row={r} onOpen={onOpen} label="Corrected entry" />
            ))}
          </ul>
        </section>
      ) : null}

      <dl className="fac-dl">
        <Field label="Recorded">{formatDateTime(detail.recordedAt)}</Field>
        <Field label="Farmer">
          <Link to={`/factory/farmers/${detail.farmer.uuid}`}>{detail.farmer.name}</Link>
          <span className="fac-dl-sub">
            {detail.farmer.farmerRef} · <IdTag value={detail.farmer.readableId} copyable={false} />
          </span>
        </Field>
        <Field label="Buying centre">
          <Link to={`/factory/centres/${detail.centre.uuid}`}>
            {detail.centre.code} {detail.centre.name}
          </Link>
        </Field>
        <Field label="Kilos">
          <strong className="tl-num">{formatKg(detail.kg)}</strong>
        </Field>
        <Field label="Plucker">
          {detail.plucker ? <Link to={`/factory/pluckers/${detail.plucker.uuid}`}>{detail.plucker.name}</Link> : 'Farmer picked it'}
        </Field>
        <Field label="Clerk">{detail.clerkName}</Field>
        <Field label="Scale">
          <span className="mono">{detail.scaleId}</span>
        </Field>
        <Field label="Device">
          <span className="mono">{detail.deviceId}</span>
        </Field>
        {detail.enteredAt ? <Field label="Entered in ledger">{formatDateTime(detail.enteredAt)}</Field> : null}
        <Field label="Hash">
          <HashText hash={detail.hash} visible={16} />
        </Field>
      </dl>

      <section aria-labelledby="fac-sample-title" className="fac-drawer-stack">
        <h3 id="fac-sample-title" className="fac-section-title">
          Leaf sample
        </h3>
        <LeafIllustration size="md" caption={detail.photoRef} note="illustration, photos are not stored in this demo" />
        <QualityMeter value={detail.fineLeafPct} target={60} label="Centre score (clerk confirmed)" />
        {detail.intakeFineLeafPct !== null ? (
          <QualityMeter value={detail.intakeFineLeafPct} target={60} label="Factory intake score" />
        ) : (
          <p className="body-sm text-muted">No factory intake score yet.</p>
        )}
        <p className="body-sm text-muted">
          AI estimate {formatPct(detail.aiFineLeafPct)}
          {detail.qualityAdjustReason ? `, adjusted by the clerk: ${detail.qualityAdjustReason}` : ', confirmed by the clerk without changes'}.
          {gap !== null ? ` Transport gap: ${formatPts(gap, 1)} between the centre and factory intake.` : ''}
        </p>
      </section>

      {detail.disputeUuids.length > 0 ? (
        <section aria-labelledby="fac-dd-disputes">
          <h3 id="fac-dd-disputes" className="fac-section-title">
            Disputes
          </h3>
          <ul className="fac-linked">
            {detail.disputeUuids.map((u, i) => (
              <li key={u}>
                <Link to={`/factory/disputes/${u}`}>Open dispute {detail.disputeUuids.length > 1 ? i + 1 : ''}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="fac-dd-correct" className="fac-drawer-stack">
        <h3 id="fac-dd-correct" className="fac-section-title">
          Record a correction
        </h3>
        {blocker ? (
          <p className="body-sm text-muted">{blocker}</p>
        ) : correcting ? (
          <CorrectionForm
            delivery={detail}
            onCancel={() => setCorrecting(false)}
            onSubmit={async (v) => {
              const res = await api.correctDelivery(detail.uuid, { kg: v.kg, reason: v.reason, membershipUuid: v.membershipUuid });
              setCorrecting(false);
              setSaved(res);
              toast.show('Correction saved');
            }}
          />
        ) : (
          <div>
            <Button variant="secondary" icon="file" onClick={() => setCorrecting(true)}>
              Record a correction
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

/** The delivery drawer. Mounted once in FactoryApp; opened by `?delivery=<uuid>`. */
export function DeliveryDrawer() {
  const { factoryUuid } = useFactoryShell();
  const [params, setParams] = useSearchParams();
  const raw = params.get(PARAM);
  const uuid = raw && isUuid(raw) ? raw : null;
  const open = useOpenDelivery();

  const q = useQuery((api) => (uuid ? api.getDelivery(factoryUuid, uuid) : Promise.reject(new Error('No delivery'))), [factoryUuid, uuid], {
    enabled: uuid !== null,
  });

  const close = useCallback(
    () =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete(PARAM);
        return next;
      }),
    [setParams],
  );

  const detail = q.data && q.data.uuid === uuid ? q.data : undefined;

  return (
    <Drawer
      open={raw !== null}
      title="Delivery"
      onClose={close}
      subtitle={
        detail ? (
          <span className="fac-inline">
            <IdTag value={detail.displayId} />
            <DeliveryStatusBadge status={detail.status} />
            {detail.status === 'pending' ? <Badge tone="neutral">Temporary device ID</Badge> : null}
          </span>
        ) : null
      }
    >
      {uuid === null ? (
        <LoadError title="This delivery link is not valid." />
      ) : q.error && !detail ? (
        <LoadError title="Could not load this delivery." message={q.error.message} onRetry={q.reload} />
      ) : !detail ? (
        <div className="fac-drawer-stack" aria-busy="true">
          <Skeleton height={20} width="60%" />
          <Skeleton height={140} />
          <Skeleton height={20} width="80%" />
          <Skeleton height={20} width="70%" />
        </div>
      ) : (
        <DeliveryBody detail={detail} onOpen={open} />
      )}
    </Drawer>
  );
}
