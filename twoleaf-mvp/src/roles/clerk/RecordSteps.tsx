/**
 * The six steps of Record delivery. Each step reads and writes the shared draft
 * (RecordDraftContext) and moves on with `update({ step })`.
 */
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '../../api';
import { Alert, Badge, Button, Card, Icon, IdTag, LeafIllustration, QualityMeter, Spinner, TextField, useToast } from '../../design-system';
import { PhoneError, PhoneLoading } from '../../layouts/PhoneLayout';
import { formatKg, formatPct, formatTime, maskPhone } from '../../lib/format';
import { DELIVERY_STATUS_LABEL } from '../../lib/labels';
import { FINE_LEAF_TARGET } from '../../lib/time';
import { MAX_QUALITY_ADJUST } from '../../store';
import { useClerkHomeSnapshot, useRecordDraft, type PickedBy } from './ClerkContext';
import { useClerkSession } from './session';
import { DELIVERY_STATUS_TONE } from './status';

/* ------------------------------------------------------------------ */
/* 1. Farmer                                                           */
/* ------------------------------------------------------------------ */

export function FarmerStep() {
  const { centreUuid } = useClerkSession();
  const { draft, update } = useRecordDraft();
  const [query, setQuery] = useState('');
  const [emptyError, setEmptyError] = useState<string | null>(null);
  const lookup = useMutation((api, q: string) => api.lookupFarmer({ centreUuid, query: q }));
  const scan = useMutation((api, _args: void) => api.scanQrCard(centreUuid));
  const farmer = draft.farmer;

  async function find(e: FormEvent): Promise<void> {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      setEmptyError('Type the farmer number from the card, for example 123.');
      return;
    }
    setEmptyError(null);
    scan.reset();
    try {
      const r = await lookup.run(q);
      update({ farmer: r, pickedBy: null });
    } catch {
      // Shown under the field.
    }
  }

  async function scanCard(): Promise<void> {
    setEmptyError(null);
    lookup.reset();
    try {
      const r = await scan.run(undefined);
      setQuery(r.farmer.farmerNumber);
      update({ farmer: r, pickedBy: null });
    } catch {
      // Shown below.
    }
  }

  if (farmer) {
    return (
      <div className="clerk-step">
        <Card>
          <div className="clerk-farmer">
            <Badge tone="success">Farmer found</Badge>
            <p className="clerk-farmer-name">{farmer.farmer.name}</p>
            <span className="clerk-ref">{farmer.farmer.farmerRef}</span>
            <IdTag value={farmer.farmer.readableId} />
            <p className="phone-muted">Phone {maskPhone(farmer.phone)}</p>
          </div>
        </Card>
        <p className="clerk-lead">Check the name with the farmer before you continue.</p>
        <div className="clerk-actions">
          <Button fullWidth icon="chevron-right" onClick={() => update({ step: 2 })}>
            Continue
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              update({ farmer: null, pickedBy: null });
              lookup.reset();
              scan.reset();
            }}
          >
            Not this farmer
          </Button>
        </div>
      </div>
    );
  }

  const busy = lookup.pending || scan.pending;
  const fieldError = emptyError ?? lookup.error?.message;

  return (
    <div className="clerk-step">
      <form className="clerk-step" onSubmit={(e) => void find(e)} noValidate>
        <TextField
          label="Farmer number"
          hint="The number on the farmer’s card, for example 123"
          inputMode="numeric"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (emptyError) setEmptyError(null);
          }}
          error={fieldError}
          disabled={busy}
        />
        <Button type="submit" fullWidth icon="search" disabled={busy}>
          {lookup.pending ? 'Finding farmer…' : 'Find farmer'}
        </Button>
      </form>
      <Button variant="secondary" fullWidth icon="qr" onClick={() => void scanCard()} disabled={busy}>
        {scan.pending ? 'Scanning…' : 'Scan QR card'}
      </Button>
      {scan.error ? <Alert tone="danger">{scan.error.message}</Alert> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Plucker                                                          */
/* ------------------------------------------------------------------ */

const FARMER_PICKED = 'farmer';

export function PluckerStep() {
  const { draft, update } = useRecordDraft();
  const farmerUuid = draft.farmer?.farmer.uuid ?? null;
  const q = useQuery((api) => (farmerUuid ? api.listLinkedPluckers(farmerUuid) : Promise.resolve([])), [farmerUuid], { live: false });
  const initial = draft.pickedBy ? (draft.pickedBy.kind === 'farmer' ? FARMER_PICKED : draft.pickedBy.plucker.uuid) : null;
  const [choice, setChoice] = useState<string | null>(initial);
  const [error, setError] = useState<string | null>(null);
  // The lookup already returned the linked pluckers, so the list shows at once;
  // listLinkedPluckers refreshes it in the background.
  const pluckers = q.data ?? draft.farmer?.pluckers ?? [];

  function next(): void {
    if (!choice) {
      setError('Choose who picked this leaf.');
      return;
    }
    let pickedBy: PickedBy;
    if (choice === FARMER_PICKED) pickedBy = { kind: 'farmer' };
    else {
      const p = pluckers.find((x) => x.uuid === choice);
      if (!p) {
        setError('Choose who picked this leaf.');
        return;
      }
      pickedBy = { kind: 'plucker', plucker: p };
    }
    update({ pickedBy, step: 3 });
  }


  return (
    <div className="clerk-step">
      <fieldset className="clerk-options" aria-describedby={error ? 'clerk-plucker-error' : undefined}>
        <legend>Pluckers linked to {draft.farmer?.farmer.name ?? 'this farmer'} (optional)</legend>
        {pluckers.map((p) => (
          <label key={p.uuid} className="clerk-option">
            <input
              type="radio"
              name="picked-by"
              value={p.uuid}
              checked={choice === p.uuid}
              onChange={() => {
                setChoice(p.uuid);
                setError(null);
              }}
            />
            <span className="clerk-option-text">
              <span className="clerk-option-name">{p.name}</span>
              <span className="clerk-option-sub">
                <IdTag value={p.readableId} copyable={false} />
              </span>
            </span>
          </label>
        ))}
        <label className="clerk-option">
          <input
            type="radio"
            name="picked-by"
            value={FARMER_PICKED}
            checked={choice === FARMER_PICKED}
            onChange={() => {
              setChoice(FARMER_PICKED);
              setError(null);
            }}
          />
          <span className="clerk-option-text">
            <span className="clerk-option-name">Farmer picked it</span>
            <span className="phone-muted">No plucker for this delivery</span>
          </span>
        </label>
      </fieldset>
      {pluckers.length === 0 ? <p className="phone-muted">No pluckers are linked to this farmer.</p> : null}
      {error ? (
        <p id="clerk-plucker-error" className="clerk-field-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button fullWidth icon="chevron-right" onClick={next}>
        Continue
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Weigh                                                            */
/* ------------------------------------------------------------------ */

export function WeighStep() {
  const { draft, update } = useRecordDraft();
  const home = useClerkHomeSnapshot();
  const read = useMutation((api, scaleId: string) => api.readScale(scaleId));
  const scaleIds = home?.scaleIds ?? [];
  // The clerk's own scale at TG-043 is the second one (SCL-TG043-02).
  const scaleId = draft.reading?.scaleId ?? scaleIds[1] ?? scaleIds[0] ?? null;
  const reading = draft.reading;

  async function weigh(): Promise<void> {
    if (!scaleId) return;
    try {
      const r = await read.run(scaleId);
      update({ reading: r });
    } catch {
      // Shown below.
    }
  }

  if (!home) return <PhoneLoading rows={1} />;
  if (!scaleId) return <PhoneError message="No scale is connected at this buying centre." />;

  return (
    <div className="clerk-step">
      <div className="clerk-reading">
        {read.pending ? (
          <Spinner label={`Reading scale ${scaleId}…`} />
        ) : reading ? (
          <>
            <span className="clerk-reading-value">
              {reading.kg.toFixed(1)}
              <span className="clerk-reading-unit">kg</span>
            </span>
            <span className="clerk-reading-meta">
              {reading.scaleId} · {formatTime(reading.readAt)}
            </span>
          </>
        ) : (
          <>
            <span className="phone-muted">Put the bag on the scale, then read it.</span>
            <span className="clerk-reading-meta">{scaleId}</span>
          </>
        )}
      </div>
      <span className="visually-hidden" aria-live="polite">
        {reading && !read.pending ? `Scale read ${reading.kg.toFixed(1)} kg` : ''}
      </span>
      <p className="phone-muted">Kilos come straight from the scale. Typing them in is not allowed, so every record matches what the scale read.</p>
      {read.error ? <Alert tone="danger">{read.error.message}</Alert> : null}
      <div className="clerk-actions">
        {reading ? (
          <>
            <Button fullWidth icon="chevron-right" onClick={() => update({ step: 4 })} disabled={read.pending}>
              Continue
            </Button>
            <Button variant="secondary" fullWidth icon="refresh" onClick={() => void weigh()} disabled={read.pending}>
              Weigh again
            </Button>
          </>
        ) : (
          <Button fullWidth icon="scale" onClick={() => void weigh()} disabled={read.pending}>
            Read scale
          </Button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Leaf sample                                                      */
/* ------------------------------------------------------------------ */

export function LeafSampleStep() {
  const { draft } = useRecordDraft();
  const ai = draft.sample?.aiFineLeafPct ?? null;
  // One live region that stays mounted while the step moves from photo to scoring to result,
  // so the score is announced once (the spinner announces "Scoring…" through its own status role).
  return (
    <>
      <span className="visually-hidden" aria-live="polite">
        {ai !== null ? `AI estimate ${ai}% fine leaf` : ''}
      </span>
      <LeafSampleBody />
    </>
  );
}

function LeafSampleBody() {
  const { deviceId } = useClerkSession();
  const { draft, update } = useRecordDraft();
  const score = useMutation((api, _args: void) => api.scoreLeafSample(deviceId));
  const [reasonError, setReasonError] = useState<string | null>(null);
  const sample = draft.sample;
  const ai = sample?.aiFineLeafPct ?? null;
  const confirmed = draft.fineLeafPct ?? ai;

  async function capture(): Promise<void> {
    update({ sample: null, fineLeafPct: null, adjustReason: '' });
    setReasonError(null);
    try {
      const r = await score.run(undefined);
      update({ sample: r, fineLeafPct: r.aiFineLeafPct, adjustReason: '' });
    } catch {
      // Shown below.
    }
  }

  if (!sample && !score.pending) {
    return (
      <div className="clerk-step">
        <p className="clerk-lead">Take a handful from the middle of the bag, spread it on the tray and photograph it.</p>
        {score.error ? <Alert tone="danger">{score.error.message}</Alert> : null}
        <Button fullWidth icon="camera" onClick={() => void capture()}>
          Capture sample photo
        </Button>
      </div>
    );
  }

  if (!sample || ai === null || confirmed === null) {
    return (
      <div className="clerk-step">
        <LeafIllustration />
        <Spinner label="Scoring…" />
      </div>
    );
  }

  const min = Math.max(0, ai - MAX_QUALITY_ADJUST);
  const max = Math.min(100, ai + MAX_QUALITY_ADJUST);
  const diff = confirmed - ai;
  const adjusted = diff !== 0;

  function setScore(v: number): void {
    update({ fineLeafPct: Math.max(min, Math.min(max, v)) });
    if (v === ai) setReasonError(null);
  }

  function next(): void {
    if (adjusted && draft.adjustReason.trim().length < 3) {
      setReasonError('Give a reason for changing the AI score.');
      document.getElementById('clerk-adjust-reason')?.focus();
      return;
    }
    update({ step: 5 });
  }

  return (
    <div className="clerk-step">
      <LeafIllustration caption={sample.photoRef} />
      <Card className="clerk-card-stack">
        <QualityMeter value={ai} target={FINE_LEAF_TARGET} label="AI estimate of fine leaf" />
        <p className="phone-muted">Model {sample.modelVersion}</p>
      </Card>

      <Card className="clerk-card-stack" title="Confirm the score" subtitle={`You can change it by up to ${MAX_QUALITY_ADJUST} points if the sample looks different.`}>
        <div className="clerk-stepper">
          <button type="button" className="clerk-stepper-btn" aria-label="Lower the score by 1 point" disabled={confirmed <= min} onClick={() => setScore(confirmed - 1)}>
            −
          </button>
          <div className="clerk-stepper-value" aria-live="polite">
            <strong>{formatPct(confirmed)}</strong>
            <span>{adjusted ? `${diff > 0 ? '+' : '−'}${Math.abs(diff)} ${Math.abs(diff) === 1 ? 'point' : 'points'} from AI` : 'Same as AI'}</span>
          </div>
          <button type="button" className="clerk-stepper-btn" aria-label="Raise the score by 1 point" disabled={confirmed >= max} onClick={() => setScore(confirmed + 1)}>
            +
          </button>
        </div>
      </Card>

      {adjusted ? (
        <TextField
          id="clerk-adjust-reason"
          label="Reason for changing the score"
          hint="For example: sample was wet, or too many coarse leaves in the photo"
          value={draft.adjustReason}
          onChange={(e) => {
            update({ adjustReason: e.target.value });
            if (reasonError) setReasonError(null);
          }}
          error={reasonError ?? undefined}
          maxLength={120}
        />
      ) : null}

      <div className="clerk-actions">
        <Button fullWidth icon="check" onClick={next}>
          Confirm score
        </Button>
        <Button variant="secondary" fullWidth icon="camera" onClick={() => void capture()}>
          Retake photo
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Confirm                                                          */
/* ------------------------------------------------------------------ */

export function ConfirmStep() {
  const { deviceId } = useClerkSession();
  const { draft, update } = useRecordDraft();
  const { show: toast } = useToast();
  const home = useClerkHomeSnapshot();
  const save = useMutation((api, _args: void) => {
    const { farmer, pickedBy, reading, sample, fineLeafPct, adjustReason } = draft;
    if (!farmer || !pickedBy || !reading || !sample || fineLeafPct === null) {
      return Promise.reject(new Error('Some details are missing. Start over and try again.'));
    }
    return api.createDelivery({
      deviceId,
      membershipUuid: farmer.farmer.membershipUuid,
      pluckerUuid: pickedBy.kind === 'plucker' ? pickedBy.plucker.uuid : null,
      kg: reading.kg,
      scaleId: reading.scaleId,
      aiFineLeafPct: sample.aiFineLeafPct,
      fineLeafPct,
      qualityAdjustReason: fineLeafPct !== sample.aiFineLeafPct ? adjustReason.trim() : null,
      photoRef: sample.photoRef,
    });
  });

  const { farmer, pickedBy, reading, sample, fineLeafPct } = draft;
  if (!farmer || !pickedBy || !reading || !sample || fineLeafPct === null) return null;
  const online = home?.online;

  async function onSave(): Promise<void> {
    try {
      const r = await save.run(undefined);
      update({ saved: r, step: 6 });
      toast(r.synced ? 'Delivery saved' : 'Delivery saved on this device', r.synced ? 'success' : 'info');
    } catch {
      // Shown below.
    }
  }

  return (
    <div className="clerk-step">
      <Card>
        <dl className="clerk-summary">
          <dt>Farmer</dt>
          <dd>{farmer.farmer.name}</dd>
          <dt>Farmer number</dt>
          <dd className="mono">{farmer.farmer.farmerRef}</dd>
          <dt>TwoLeaf ID</dt>
          <dd>
            <IdTag value={farmer.farmer.readableId} copyable={false} />
          </dd>
          <dt>Picked by</dt>
          <dd>{pickedBy.kind === 'plucker' ? pickedBy.plucker.name : 'Farmer'}</dd>
          <dt>Weight</dt>
          <dd>
            <strong>{formatKg(reading.kg)}</strong>
          </dd>
          <dt>Scale</dt>
          <dd className="mono">{reading.scaleId}</dd>
          <dt>Fine leaf</dt>
          <dd>
            <strong>{formatPct(fineLeafPct)}</strong>
            {fineLeafPct !== sample.aiFineLeafPct ? ` (AI ${formatPct(sample.aiFineLeafPct)})` : ''}
          </dd>
          {fineLeafPct !== sample.aiFineLeafPct ? (
            <>
              <dt>Reason</dt>
              <dd>{draft.adjustReason.trim()}</dd>
            </>
          ) : null}
          <dt>Photo</dt>
          <dd className="mono">{sample.photoRef}</dd>
        </dl>
      </Card>

      {online === false ? (
        <Alert tone="warning" title="You are offline">
          This delivery is saved on this device with a temporary ID. It gets its TwoLeaf ID when you sync.
        </Alert>
      ) : online === true ? (
        <Alert tone="info">You are online. The delivery is sent to Tegat as soon as you save it.</Alert>
      ) : null}

      {save.error ? <Alert tone="danger">{save.error.message}</Alert> : null}

      <Button fullWidth icon="check" className="clerk-big-btn" onClick={() => void onSave()} disabled={save.pending}>
        {save.pending ? 'Saving…' : 'Save delivery'}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Receipt                                                          */
/* ------------------------------------------------------------------ */

export function ReceiptStep() {
  const { draft, reset } = useRecordDraft();
  const saved = draft.saved;
  if (!saved) return null;
  const d = saved.delivery;

  return (
    <div className="clerk-step">
      <Card>
        <div className="clerk-receipt">
          <span className={saved.synced ? 'clerk-receipt-icon' : 'clerk-receipt-icon is-pending'} aria-hidden="true">
            <Icon name={saved.synced ? 'check' : 'clock'} />
          </span>
          <p className="phone-muted">{saved.synced ? 'Delivery ID' : 'Temporary ID'}</p>
          <IdTag value={d.displayId} />
          <Badge tone={DELIVERY_STATUS_TONE[d.status]}>{DELIVERY_STATUS_LABEL[d.status]}</Badge>
        </div>
      </Card>

      <Card>
        <dl className="clerk-summary">
          <dt>Farmer</dt>
          <dd>{d.farmer.name}</dd>
          <dt>Farmer number</dt>
          <dd className="mono">{d.farmer.farmerRef}</dd>
          <dt>Weight</dt>
          <dd>
            <strong>{formatKg(d.kg)}</strong>
          </dd>
          <dt>Fine leaf</dt>
          <dd>{formatPct(d.fineLeafPct)}</dd>
          <dt>Picked by</dt>
          <dd>{d.plucker ? d.plucker.name : 'Farmer'}</dd>
          <dt>Time</dt>
          <dd>{formatTime(d.recordedAt)}</dd>
        </dl>
      </Card>

      <Alert tone="success">SMS sent to {saved.smsTo}</Alert>
      {!saved.synced ? <p className="phone-muted">This delivery gets its TwoLeaf ID when the device syncs. The record stays the same.</p> : null}

      <Button fullWidth icon="plus" className="clerk-big-btn" onClick={reset}>
        Record next delivery
      </Button>
    </div>
  );
}
