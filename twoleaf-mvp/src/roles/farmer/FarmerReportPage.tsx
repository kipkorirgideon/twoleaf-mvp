/**
 * Report a problem (opens a dispute). From a delivery (`deliveries/:uuid/report`)
 * or, for a missing delivery, from Disputes (`report`, the farmer picks the centre).
 */
import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '../../api';
import { Alert, Badge, Button, Card, IdTag, SelectField, TextAreaField } from '../../design-system';
import { PhoneError, PhoneLoading, PhoneScreen } from '../../layouts/PhoneLayout';
import { isUuid } from '../../lib/ids';
import { disputeReasonKey, disputeStatusKey, useLocalFormat, useT } from '../../lib/i18n';
import type { DisputeReason, FarmerDisputeRow, Uuid } from '../../types';
import { FARMER_BASE, useFarmerProfile, useFarmerSession } from './session';

const REASONS: DisputeReason[] = ['weight_wrong', 'quality_wrong', 'delivery_missing', 'wrong_farmer_number', 'other'];
const NOTE_MAX = 500;

export function FarmerReportPage() {
  const t = useT();
  const f = useLocalFormat();
  const navigate = useNavigate();
  const { farmerUuid } = useFarmerSession();
  const profile = useFarmerProfile();
  const { deliveryUuid } = useParams();
  const fromDelivery = deliveryUuid !== undefined;
  const uuid = deliveryUuid && isUuid(deliveryUuid) ? deliveryUuid : null;

  const deliveryQ = useQuery((api) => (uuid ? api.getFarmerDelivery(farmerUuid, uuid) : Promise.reject(new Error('not found'))), [farmerUuid, uuid], {
    enabled: uuid !== null,
    live: false,
  });
  const delivery = deliveryQ.data;

  const [reason, setReason] = useState<DisputeReason | null>(fromDelivery ? null : 'delivery_missing');
  const [note, setNote] = useState('');
  const [centreMembership, setCentreMembership] = useState<Uuid | null>(null);
  const [errors, setErrors] = useState<{ reason?: string; note?: string; centre?: string }>({});
  const [sent, setSent] = useState<FarmerDisputeRow | null>(null);
  const send = useMutation((api, req: { membershipUuid: Uuid; deliveryUuid: Uuid | null; reason: DisputeReason; note: string }) =>
    api.openDispute({ farmerUuid, ...req }),
  );

  // The membership comes from the delivery's centre (one membership per centre),
  // or from the centre the farmer picks for a missing delivery.
  const memberships = profile?.memberships ?? [];
  const membershipUuid: Uuid | null = fromDelivery
    ? (memberships.find((m) => m.centre.uuid === delivery?.centre.uuid)?.membershipUuid ?? null)
    : (centreMembership ?? (memberships.length === 1 ? (memberships[0]?.membershipUuid ?? null) : null));

  const back = fromDelivery && uuid ? `${FARMER_BASE}/deliveries/${uuid}` : `${FARMER_BASE}/disputes`;
  const noteRequired = reason === 'other';

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    const next: typeof errors = {};
    if (!reason) next.reason = t('report.chooseReason');
    if (noteRequired && note.trim().length < 5) next.note = t('report.noteRequired');
    if (note.length > NOTE_MAX) next.note = t('report.noteTooLong');
    if (!fromDelivery && !membershipUuid) next.centre = t('report.chooseCentre');
    setErrors(next);
    if (Object.keys(next).length > 0 || !reason || !membershipUuid) {
      const first = next.reason ? 'fm-report-reasons' : next.centre ? 'fm-report-centre' : 'fm-report-note';
      document.getElementById(first)?.focus();
      return;
    }
    try {
      const row = await send.run({ membershipUuid, deliveryUuid: fromDelivery ? uuid : null, reason, note: note.trim() });
      setSent(row);
    } catch {
      // Shown below in the farmer's language.
    }
  }

  if (sent) {
    return (
      <PhoneScreen title={t('report.sentTitle')} back={`${FARMER_BASE}/disputes`} backLabel={t('shell.back')}>
        <Card className="fm-stack">
          <Badge tone="warning">{t(disputeStatusKey(sent.status))}</Badge>
          <p className="fm-centre-name">{t(disputeReasonKey(sent.reason))}</p>
          <IdTag value={sent.readableId} copyable={false} />
          <p className="fm-sentence">{t('report.sentBody', { factory: sent.factoryShortName, date: f.date(sent.deadlineAt) })}</p>
        </Card>
        <Button fullWidth icon="alert" onClick={() => navigate(`${FARMER_BASE}/disputes`)}>
          {t('deliveries.seeDisputes')}
        </Button>
      </PhoneScreen>
    );
  }

  const loading = (fromDelivery && deliveryQ.initialLoading) || !profile;

  return (
    <PhoneScreen title={t('common.reportProblem')} back={back} backLabel={t('shell.back')}>
      {fromDelivery && uuid === null ? <PhoneError message={t('shell.notFound')} /> : null}
      {deliveryQ.error && !delivery ? <PhoneError message={t('shell.notFound')} retryLabel={t('shell.tryAgain')} onRetry={deliveryQ.reload} /> : null}
      {loading && !deliveryQ.error ? <PhoneLoading label={t('shell.loading')} rows={2} /> : null}
      {!loading && (!fromDelivery || delivery) ? (
        <form className="fm-stack" onSubmit={(e) => void submit(e)} noValidate>
          {delivery ? (
            <Card className="fm-stack">
              <p className="fm-muted">{t('report.about')}</p>
              <IdTag value={delivery.displayId} copyable={false} />
              <p className="fm-small">
                {f.dateTime(delivery.recordedAt)} · {delivery.farmerRef}
              </p>
            </Card>
          ) : (
            <>
              <p className="fm-muted">{t('report.missingIntro')}</p>
              <SelectField
                id="fm-report-centre"
                label={t('report.centreLabel')}
                value={membershipUuid ?? ''}
                error={errors.centre}
                onChange={(e) => {
                  const v = e.target.value;
                  setCentreMembership(v && isUuid(v) ? v : null);
                  setErrors((x) => ({ ...x, centre: undefined }));
                }}
              >
                <option value="" disabled>
                  {t('report.centreLabel')}
                </option>
                {memberships.map((m) => (
                  <option key={m.membershipUuid} value={m.membershipUuid}>
                    {m.farmerRef} · {m.factory.name}
                  </option>
                ))}
              </SelectField>
            </>
          )}

          <fieldset id="fm-report-reasons" tabIndex={-1} className="fm-options" aria-describedby={errors.reason ? 'fm-report-reason-error' : undefined}>
            <legend>{t('report.reasonLegend')}</legend>
            {REASONS.map((r) => (
              <label key={r} className="fm-option">
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => {
                    setReason(r);
                    setErrors((x) => ({ ...x, reason: undefined }));
                  }}
                />
                <span>{t(disputeReasonKey(r))}</span>
              </label>
            ))}
          </fieldset>
          {errors.reason ? (
            <p id="fm-report-reason-error" className="fm-error" role="alert">
              {errors.reason}
            </p>
          ) : null}

          <TextAreaField
            id="fm-report-note"
            label={noteRequired ? t('report.noteLabelRequired') : t('report.noteLabel')}
            hint={t('report.noteHint')}
            value={note}
            maxLength={NOTE_MAX}
            error={errors.note}
            onChange={(e) => {
              setNote(e.target.value);
              setErrors((x) => ({ ...x, note: undefined }));
            }}
          />

          {send.error ? <Alert tone="danger">{send.error.code === 'conflict' ? t('report.errorDuplicate') : t('report.errorGeneric')}</Alert> : null}

          <Button type="submit" fullWidth icon="upload" disabled={send.pending}>
            {send.pending ? t('report.sending') : t('common.send')}
          </Button>
        </form>
      ) : null}
    </PhoneScreen>
  );
}
