import { useRef, useState, type ChangeEvent } from 'react';
import { Alert, Button, Card, DataTable, IdTag, type DataTableColumn, useToast } from '../../../design-system';
import { useMutation, useQuery } from '../../../api';
import { STAFF_ROLE_LABEL } from '../../../lib/labels';
import { formatDate, formatNumber } from '../../../lib/format';
import { LoadError, PageHeader } from '../../../layouts/WebLayout';
import type { StaffUser } from '../../../types';
import { useFactoryShell } from '../FactoryContext';
import { CardSkeleton } from '../../../components/web/common';

const MAX_BYTES = 1024 * 1024;
const TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];

const STAFF_COLUMNS: DataTableColumn<StaffUser>[] = [
  { key: 'name', label: 'Name', render: (u) => <span className="web-nowrap">{u.name}</span> },
  { key: 'title', label: 'Title', render: (u) => u.title },
  { key: 'role', label: 'Role', render: (u) => STAFF_ROLE_LABEL[u.role] },
  { key: 'phone', label: 'Phone', render: (u) => <span className="tl-num web-nowrap">{u.phone}</span> },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read the file.')));
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });
}

/** Factory settings: logo, read-only profile, users and roles. */
export function SettingsPage() {
  const { factoryUuid } = useFactoryShell();
  const toast = useToast();
  const q = useQuery((api) => api.getFactoryProfile(factoryUuid), [factoryUuid]);
  const setLogo = useMutation((api, dataUrl: string | null) => api.setFactoryLogo(factoryUuid, dataUrl));
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const d = q.data;
  const logo = d?.factory.logoDataUrl ?? null;

  async function onFile(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    setFileError(null);
    setLogo.reset();
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!TYPES.includes(file.type)) {
      setFileError('Use a PNG, JPG or SVG image.');
      return;
    }
    if (file.size >= MAX_BYTES) {
      setFileError(`This file is ${formatNumber(file.size / 1024 / 1024, 1)} MB. The logo must be under 1 MB.`);
      return;
    }
    try {
      const url = await readAsDataUrl(file);
      await setLogo.run(url);
      toast.show('Logo updated');
    } catch (err) {
      if (!(err instanceof Error) || err.name !== 'ApiError') setFileError(err instanceof Error ? err.message : 'Could not read the file.');
    }
  }

  async function remove(): Promise<void> {
    setFileError(null);
    try {
      await setLogo.run(null);
      toast.show('Logo removed');
    } catch {
      // shown inline
    }
  }

  const error = fileError ?? setLogo.error?.message ?? null;

  return (
    <>
      <PageHeader title="Settings" subtitle="Your factory's logo, profile, and who has access." />
      {q.error && !d ? <LoadError title="Could not load settings." message={q.error.message} onRetry={q.reload} /> : null}

      <Card titleLevel={2} title="Factory logo" subtitle="PNG, JPG or SVG, under 1 MB">
        {!d ? (
          <CardSkeleton />
        ) : (
          <div className="fac-logo-row">
            <div className="fac-logo-preview" aria-label={logo ? 'Current logo' : 'No logo: initials are shown'} role="img">
              {logo ? <img src={logo} alt="" /> : <span aria-hidden="true">{initials(d.factory.name)}</span>}
            </div>
            <div className="web-stack">
              <p className="body-sm">Your logo appears in the sidebar for everyone at {d.factory.shortName}. Colours, fonts and the Powered by credit stay the same.</p>
              <input
                ref={inputRef}
                id="fac-logo-input"
                className="visually-hidden"
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={(e) => void onFile(e)}
                aria-describedby="fac-logo-hint"
              />
              <div className="fac-form-actions">
                <Button icon="upload" onClick={() => inputRef.current?.click()} disabled={setLogo.pending}>
                  {setLogo.pending ? 'Saving…' : logo ? 'Replace logo' : 'Upload logo'}
                </Button>
                {logo ? (
                  <Button variant="secondary" icon="x" onClick={() => void remove()} disabled={setLogo.pending}>
                    Remove logo
                  </Button>
                ) : null}
              </div>
              <span id="fac-logo-hint" className="body-sm text-muted">
                {logo ? 'Remove logo falls back to initials.' : 'Without a logo the sidebar shows your initials.'}
              </span>
              {error ? (
                <Alert tone="danger" title="Logo not changed">
                  {error}
                </Alert>
              ) : null}
            </div>
          </div>
        )}
      </Card>

      <Card titleLevel={2} title="Factory profile" subtitle="Set at registration. Contact the county to change it.">
        {!d ? (
          <CardSkeleton lines={4} />
        ) : (
          <dl className="fac-dl">
            <div className="fac-dl-row">
              <dt>Name</dt>
              <dd>{d.factory.name}</dd>
            </div>
            <div className="fac-dl-row">
              <dt>TwoLeaf ID</dt>
              <dd>
                <IdTag value={d.factory.readableId} />
              </dd>
            </div>
            <div className="fac-dl-row">
              <dt>Factory code</dt>
              <dd className="mono">{d.factory.code}</dd>
            </div>
            <div className="fac-dl-row">
              <dt>County</dt>
              <dd>
                {d.county.name} · <IdTag value={d.county.readableId} copyable={false} /> · county code {d.county.officialCode}
              </dd>
            </div>
            <div className="fac-dl-row">
              <dt>Buying centres</dt>
              <dd className="tl-num">{formatNumber(d.centreCount)}</dd>
            </div>
            <div className="fac-dl-row">
              <dt>Registered</dt>
              <dd>{formatDate(d.factory.registeredOn)}</dd>
            </div>
          </dl>
        )}
      </Card>

      <section className="web-section" aria-labelledby="fac-users">
        <h2 id="fac-users" className="h3">
          Users and roles
        </h2>
        <DataTable caption="Users and roles" columns={STAFF_COLUMNS} rows={d?.staff ?? []} loading={!d} rowKey={(u) => u.uuid} emptyMessage="No users yet." />
      </section>
    </>
  );
}
