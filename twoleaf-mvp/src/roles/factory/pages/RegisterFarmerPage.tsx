import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, IdTag, SelectField, TextField, useToast } from '../../../design-system';
import { ApiError, useApi, useQuery, type RegisterFarmerResponse } from '../../../api';
import { formatFarmerRef, sameFarmerNumber } from '../../../lib/ids';
import { PageHeader } from '../../../layouts/WebLayout';
import type { Uuid } from '../../../types';
import { useFactoryShell } from '../FactoryContext';

interface FormState {
  name: string;
  phone: string;
  nationalId: string;
  centre: string;
  farmerNumber: string;
}

const EMPTY: FormState = { name: '', phone: '', nationalId: '', centre: '', farmerNumber: '' };
type Field = keyof FormState;

const PHONE_RE = /^07\d{2}\s?\d{3}\s?\d{3}$/;

/** Register a farmer at one of this factory's buying centres. */
export function RegisterFarmerPage() {
  const { factoryUuid } = useFactoryShell();
  const api = useApi();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [numberEdited, setNumberEdited] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<ApiError | null>(null);
  const [result, setResult] = useState<RegisterFarmerResponse | null>(null);

  const centreUuid = form.centre ? (form.centre as Uuid) : null;
  const centresQ = useQuery((a) => a.listCentres(factoryUuid), [factoryUuid], { live: false });
  const suggestQ = useQuery((a) => (centreUuid ? a.suggestFarmerNumber(centreUuid) : Promise.resolve('')), [centreUuid], { enabled: centreUuid !== null });
  const takenQ = useQuery((a) => (centreUuid ? a.listFarmers({ factoryUuid, centreUuid }) : Promise.resolve([])), [factoryUuid, centreUuid], {
    enabled: centreUuid !== null,
  });
  const centre = centresQ.data?.find((c) => c.uuid === form.centre);

  // Suggest the next free number whenever the centre changes, unless the person typed their own.
  useEffect(() => {
    if (!numberEdited && suggestQ.data !== undefined && centreUuid) setForm((f) => ({ ...f, farmerNumber: suggestQ.data ?? '' }));
  }, [suggestQ.data, numberEdited, centreUuid]);

  function set(field: Field, value: string): void {
    setForm((f) => ({ ...f, [field]: value }));
    setServerError(null);
  }

  const takenBy = (takenQ.data ?? []).find((r) => form.farmerNumber.trim() !== '' && sameFarmerNumber(r.farmer.farmerNumber, form.farmerNumber.trim()));

  const errors: Partial<Record<Field, string>> = {};
  if (form.name.trim().split(/\s+/).filter(Boolean).length < 2) errors.name = 'Enter the farmer’s first and last name.';
  if (!PHONE_RE.test(form.phone.trim())) errors.phone = 'Enter a phone number like 0722 123 456.';
  if (!/^\d{7,8}$/.test(form.nationalId.trim())) errors.nationalId = 'National ID must be 7 or 8 digits.';
  if (!form.centre) errors.centre = 'Choose a buying centre.';
  if (!/^\d{1,4}$/.test(form.farmerNumber.trim())) errors.farmerNumber = 'Farmer number must be 1 to 4 digits.';
  else if (Number(form.farmerNumber) === 0) errors.farmerNumber = 'Farmer number must be more than 0.';
  else if (takenBy && centre)
    errors.farmerNumber = `${formatFarmerRef(centre.code, takenBy.farmer.farmerNumber)} is already taken at this centre${suggestQ.data ? `. Try ${suggestQ.data}.` : '.'}`;

  const show = (f: Field): string | undefined => ((submitted || touched[f]) && errors[f]) || (serverError?.field === f || (f === 'centre' && serverError?.field === 'centreUuid') ? serverError?.message : undefined);
  const blur = (f: Field) => () => setTouched((t) => ({ ...t, [f]: true }));

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);
    if (Object.keys(errors).length > 0 || !centreUuid) return;
    setSaving(true);
    try {
      const res = await api.registerFarmer({
        factoryUuid,
        name: form.name.trim().replace(/\s+/g, ' '),
        phone: form.phone.trim(),
        nationalId: form.nationalId.trim(),
        centreUuid,
        farmerNumber: form.farmerNumber.trim(),
      });
      setResult(res);
      toast.show('Farmer registered');
    } catch (err) {
      setServerError(err instanceof ApiError ? err : new ApiError('validation', 'Could not register the farmer. Try again.'));
    } finally {
      setSaving(false);
    }
  }

  function another(): void {
    setForm(EMPTY);
    setTouched({});
    setSubmitted(false);
    setNumberEdited(false);
    setResult(null);
  }

  const generalError = serverError && !['name', 'phone', 'nationalId', 'centreUuid', 'farmerNumber'].includes(serverError.field ?? '') ? serverError.message : null;

  return (
    <>
      <PageHeader title="Register farmer" subtitle="Adds a farmer number at one of your buying centres." back={{ to: '/factory/farmers', label: 'Farmers' }} />

      {result ? (
        <Card>
          <div className="web-stack">
            <Alert tone="success" title={result.existingFarmer ? `${result.name} now delivers to ${result.farmerRef}` : `${result.name} is registered`}>
              {result.existingFarmer
                ? 'This national ID already had a TwoLeaf ID, so only a new membership was added.'
                : 'A new TwoLeaf ID and farmer number were created.'}
            </Alert>
            <dl className="fac-dl">
              <div className="fac-dl-row">
                <dt>TwoLeaf ID</dt>
                <dd>
                  <IdTag value={result.readableId} />
                </dd>
              </div>
              <div className="fac-dl-row">
                <dt>Centre / number</dt>
                <dd>
                  <IdTag value={result.farmerRef} />
                </dd>
              </div>
            </dl>
            <div className="fac-form-actions">
              <Link className="tl-btn tl-btn-primary" to={`/factory/farmers/${result.farmerUuid}`}>
                <span>Open farmer</span>
              </Link>
              <Button variant="secondary" icon="plus" onClick={another}>
                Register another farmer
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="fac-form-card">
          <form className="fac-form" onSubmit={(e) => void submit(e)} noValidate>
            <TextField label="Full name" autoComplete="off" value={form.name} onChange={(e) => set('name', e.target.value)} onBlur={blur('name')} error={show('name')} />
            <TextField
              label="Phone"
              type="tel"
              inputMode="tel"
              placeholder="0722 123 456"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              onBlur={blur('phone')}
              error={show('phone')}
            />
            <TextField
              label="National ID"
              inputMode="numeric"
              value={form.nationalId}
              onChange={(e) => set('nationalId', e.target.value)}
              onBlur={blur('nationalId')}
              error={show('nationalId')}
              hint="Used to link farmers who already have a TwoLeaf ID."
            />
            <SelectField
              label="Buying centre"
              value={form.centre}
              onChange={(e) => {
                set('centre', e.target.value);
                setNumberEdited(false);
              }}
              onBlur={blur('centre')}
              error={show('centre')}
              disabled={!centresQ.data}
              hint={centresQ.error ? 'Could not load buying centres.' : undefined}
            >
              <option value="">{centresQ.data ? 'Choose a centre' : 'Loading…'}</option>
              {(centresQ.data ?? []).map((c) => (
                <option key={c.uuid} value={c.uuid}>
                  {c.code} {c.name}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Farmer number"
              inputMode="numeric"
              value={form.farmerNumber}
              disabled={!centreUuid}
              onChange={(e) => {
                set('farmerNumber', e.target.value);
                setNumberEdited(true);
              }}
              onBlur={blur('farmerNumber')}
              error={show('farmerNumber') || (centreUuid && touched.farmerNumber === undefined && takenBy ? errors.farmerNumber : undefined)}
              hint={
                !centreUuid
                  ? 'Choose a centre first.'
                  : suggestQ.loading && !numberEdited
                    ? 'Finding the next free number…'
                    : centre
                      ? `Unique within ${centre.code}. Shown as ${formatFarmerRef(centre.code, form.farmerNumber.trim() || '…')}.`
                      : undefined
              }
            />
            {generalError ? <Alert tone="danger" title="Farmer not registered">{generalError}</Alert> : null}
            <div className="fac-form-actions">
              <Button type="submit" icon="check" disabled={saving}>
                {saving ? 'Registering…' : 'Register farmer'}
              </Button>
              <Link className="tl-btn tl-btn-ghost" to="/factory/farmers">
                <span>Cancel</span>
              </Link>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}
