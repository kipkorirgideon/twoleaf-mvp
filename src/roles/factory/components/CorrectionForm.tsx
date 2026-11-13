import { useState, type FormEvent, type ReactNode } from 'react';
import { Alert, Button, SelectField, TextAreaField, TextField } from '../../../design-system';
import { ApiError, useQuery } from '../../../api';
import { formatKg } from '../../../lib/format';
import type { DeliveryRow, Uuid } from '../../../types';
import { useFactoryShell } from '../FactoryContext';

export interface CorrectionValues {
  kg: number;
  reason: string;
  /** Set when the delivery moves to another farmer number at this factory. */
  membershipUuid: Uuid | null;
}

export interface CorrectionFormProps {
  /** The entry being corrected. */
  delivery: Pick<DeliveryRow, 'uuid' | 'displayId' | 'kg' | 'farmer' | 'centre'>;
  /** Saves the correction. Throw an ApiError to show it inline. */
  onSubmit: (values: CorrectionValues) => Promise<void>;
  onCancel: () => void;
  /** Offer "Move to another farmer number" (wrong farmer number disputes). */
  allowMove?: boolean;
  submitLabel?: string;
  /** Prefilled reason, e.g. from a dispute. */
  initialReason?: string;
  busy?: boolean;
  /** Extra fields rendered above the buttons (e.g. a note to the farmer). */
  children?: ReactNode;
}

const MAX_KG = 200;

/** Validates the kilos field: more than 0, at most 200, one decimal. */
function kgError(raw: string): string | null {
  if (raw.trim() === '') return 'Enter the corrected kilos.';
  const n = Number(raw);
  if (!Number.isFinite(n)) return 'Kilos must be a number.';
  if (!(n > 0)) return 'Kilos must be more than 0.';
  if (n > MAX_KG) return `Kilos must be ${MAX_KG} or less.`;
  if (Math.abs(Math.round(n * 10) - n * 10) > 1e-6) return 'Kilos are recorded to one decimal.';
  return null;
}

/**
 * Correction form: new kilos + reason. Saving creates a reversal (negative kg)
 * and a corrected entry; the original stays visible, marked Corrected.
 */
export function CorrectionForm({ delivery, onSubmit, onCancel, allowMove, submitLabel = 'Save correction', initialReason = '', busy, children }: CorrectionFormProps) {
  const { factoryUuid } = useFactoryShell();
  const [kg, setKg] = useState(String(delivery.kg));
  const [reason, setReason] = useState(initialReason);
  const [move, setMove] = useState('');
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);

  const farmersQ = useQuery(
    (api) => api.listFarmers({ factoryUuid, centreUuid: delivery.centre.uuid }),
    [factoryUuid, delivery.centre.uuid],
    { enabled: Boolean(allowMove), live: false },
  );

  const sameMember = move === '' || move === delivery.farmer.membershipUuid;
  let kgErr = kgError(kg);
  if (!kgErr && sameMember && Math.round(Number(kg) * 10) === Math.round(delivery.kg * 10)) {
    kgErr = 'The corrected kilos are the same as the original. Change the kilos or the farmer number.';
  }
  const reasonErr = reason.trim().length < 5 ? 'Give a reason for the correction (at least 5 characters).' : null;

  const fieldErr = (field: string): string | undefined => (serverError?.field === field ? serverError.message : undefined);
  const generalErr = serverError && !['kg', 'reason', 'membershipUuid'].includes(serverError.field ?? '') ? serverError.message : null;

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setTouched(true);
    setServerError(null);
    if (kgErr || reasonErr) return;
    setSaving(true);
    try {
      await onSubmit({ kg: Math.round(Number(kg) * 10) / 10, reason: reason.trim(), membershipUuid: sameMember ? null : (move as Uuid) });
    } catch (err) {
      setServerError(err instanceof ApiError ? err : new ApiError('validation', err instanceof Error ? err.message : 'Could not save the correction.'));
    } finally {
      setSaving(false);
    }
  }

  const pending = saving || Boolean(busy);

  return (
    <form className="fac-form" onSubmit={(e) => void submit(e)} noValidate>
      <p className="body-sm text-muted">
        Original: {delivery.displayId}, {formatKg(delivery.kg)} for {delivery.farmer.farmerRef}. Saving adds a reversal of {formatKg(-delivery.kg)} and a
        new corrected entry. Nothing is edited or deleted.
      </p>
      <TextField
        label="Corrected kilos"
        type="number"
        inputMode="decimal"
        step="0.1"
        min="0.1"
        max={MAX_KG}
        value={kg}
        onChange={(e) => setKg(e.target.value)}
        error={(touched && kgErr) || fieldErr('kg')}
        hint="One decimal, as read from the scale."
      />
      {allowMove ? (
        <SelectField
          label="Farmer number"
          value={move}
          onChange={(e) => setMove(e.target.value)}
          error={fieldErr('membershipUuid')}
          hint={farmersQ.initialLoading ? 'Loading farmers at this centre…' : 'Change only if the delivery was recorded under the wrong farmer number.'}
          disabled={farmersQ.initialLoading}
        >
          <option value="">Keep {delivery.farmer.farmerRef} ({delivery.farmer.name})</option>
          {(farmersQ.data ?? [])
            .filter((r) => r.farmer.membershipUuid !== delivery.farmer.membershipUuid)
            .map((r) => (
              <option key={r.farmer.membershipUuid} value={r.farmer.membershipUuid}>
                Move to {r.farmer.farmerRef} ({r.farmer.name})
              </option>
            ))}
        </SelectField>
      ) : null}
      <TextAreaField
        label="Reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        error={(touched && reasonErr) || fieldErr('reason')}
        hint="Shown on the ledger next to the reversal and the corrected entry."
        maxLength={300}
      />
      {children}
      {generalErr ? (
        <Alert tone="danger" title="Correction not saved">
          {generalErr}
        </Alert>
      ) : null}
      <div className="fac-form-actions">
        <Button type="submit" icon="check" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
