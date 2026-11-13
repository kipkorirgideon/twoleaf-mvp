import { useState, type ReactNode } from 'react';
import './DesignPage.css';
import { twoleafIconUrl, twoleafLogoDarkUrl, twoleafLogoUrl } from './assets';
import type { Theme } from './theme';
import { Alert } from './components/Alert';
import { Badge } from './components/Badge';
import { Button } from './components/Button';
import { Card } from './components/Card';
import { DataTable, type DataTableColumn } from './components/DataTable';
import { Footer } from './components/Footer';
import { Icon, ICON_NAMES } from './components/Icon';
import { IdTag } from './components/IdTag';
import { LeafIllustration } from './components/LeafIllustration';
import { MariakaniMark } from './components/MariakaniMark';
import { PoweredBy } from './components/PoweredBy';
import { QualityMeter } from './components/QualityMeter';
import { SelectField } from './components/SelectField';
import { Sidebar, type SidebarGroup } from './components/Sidebar';
import { Skeleton, Spinner } from './components/Skeleton';
import { StatCard } from './components/StatCard';
import { TextAreaField } from './components/TextAreaField';
import { TextField } from './components/TextField';
import { ThemeToggle } from './components/ThemeToggle';
import { Toast, ToastProvider, useToast, type ToastTone } from './components/Toast';

/**
 * /design: every design-system component and state, rendered in a light panel
 * and a dark panel side by side (each panel sets its own data-theme).
 * The ThemeToggle in the header switches the page theme and is saved.
 */

interface SampleRow {
  id: string;
  time: string;
  farmer: string;
  number: string;
  kg: number;
  fine: number;
  status: 'synced' | 'pending' | 'corrected';
}

const ROWS: SampleRow[] = [
  { id: 'TLF-KCO-DLV-2026-00845123', time: '07:12', farmer: 'Kipkoech Ngetich', number: 'TG-043 / 123', kg: 32.4, fine: 66, status: 'synced' },
  { id: 'TLF-KCO-DLV-2026-00845124', time: '08:05', farmer: 'Chepkemoi Rotich', number: 'TG-043 / 087', kg: 27.9, fine: 54, status: 'pending' },
  { id: 'TLF-KCO-DLV-2026-00845125', time: '09:41', farmer: 'Kibet Cheruiyot', number: 'TG-043 / 112', kg: 41.0, fine: 61, status: 'corrected' },
];

const STATUS_TONE = { synced: 'success', pending: 'warning', corrected: 'info' } as const;
const STATUS_LABEL = { synced: 'Synced', pending: 'Pending sync', corrected: 'Corrected' } as const;

const COLUMNS: DataTableColumn<SampleRow>[] = [
  { key: 'time', label: 'Time' },
  { key: 'id', label: 'Delivery ID', render: (r) => <IdTag value={r.id} /> },
  { key: 'farmer', label: 'Farmer', render: (r) => `${r.number} · ${r.farmer}` },
  { key: 'kg', label: 'Kg', align: 'right', render: (r) => r.kg.toFixed(1) },
  { key: 'fine', label: 'Fine leaf', align: 'right', render: (r) => `${r.fine}%` },
  { key: 'status', label: 'Status', render: (r) => <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge> },
];

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    items: [
      { label: 'Dashboard', icon: 'home', to: '/design', end: true },
      { label: 'Deliveries', icon: 'scale', to: '/design/deliveries' },
      { label: 'Farmers', icon: 'users', to: '/design/farmers' },
    ],
  },
  {
    label: 'Records',
    items: [
      { label: 'Disputes', icon: 'alert', to: '/design/disputes', count: 5 },
      { label: 'Audit', icon: 'shield', to: '/design/audit' },
      { label: 'Plain link (href)', icon: 'file', href: '#plain', active: false },
    ],
  },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="ds-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function ToastDemo() {
  const toast = useToast();
  const tones: ToastTone[] = ['success', 'info', 'warning', 'danger'];
  const text: Record<ToastTone, string> = {
    success: 'Delivery saved',
    info: '3 deliveries synced',
    warning: 'Saved offline. It will sync when you are back online.',
    danger: 'Could not save the delivery. Try again.',
  };
  return (
    <div className="ds-row">
      {tones.map((t) => (
        <Button key={t} size="sm" variant="secondary" onClick={() => toast.show(text[t], t)}>
          Show {t}
        </Button>
      ))}
    </div>
  );
}

function Gallery({ theme }: { theme: Theme }) {
  const [opened, setOpened] = useState<string | null>(null);
  const [kg, setKg] = useState('0');
  const kgError = Number(kg) > 0 ? undefined : 'Kilos must be more than 0';
  const p = theme; // prefix for ids so the two panels never share an id

  return (
    <div className="ds-panel" data-theme={theme}>
      <div className="ds-panel-title">
        <Icon name={theme === 'light' ? 'sun' : 'moon'} />
        <h2 className="h2">{theme === 'light' ? 'Light theme' : 'Dark theme'}</h2>
      </div>

      <Section title="Logos">
        <div className="ds-logos">
          <img src={twoleafIconUrl} alt="TwoLeaf icon" style={{ height: 56 }} />
          <img src={theme === 'light' ? twoleafLogoUrl : twoleafLogoDarkUrl} alt="TwoLeaf" />
          <MariakaniMark size={20} />
          <MariakaniMark size={44} />
        </div>
      </Section>

      <Section title={`Icon (${ICON_NAMES.length})`}>
        <div className="ds-icons">
          {ICON_NAMES.map((n) => (
            <div key={n} className="ds-icon">
              <Icon name={n} />
              {n}
            </div>
          ))}
        </div>
        <div className="ds-row">
          <Icon name="leaf" size={32} label="Leaf (labelled icon)" />
          <span className="ds-note">Labelled icon (role img) at size 32.</span>
        </div>
      </Section>

      <Section title="Button">
        <div className="ds-row">
          <Button>Record delivery</Button>
          <Button variant="secondary">Export</Button>
          <Button variant="ghost">View all</Button>
          <Button variant="danger">Report a problem</Button>
        </div>
        <div className="ds-row">
          <Button icon="plus">Register farmer</Button>
          <Button variant="secondary" icon="refresh">
            Sync now
          </Button>
          <Button size="sm" variant="secondary" icon="search">
            Filter
          </Button>
          <Button size="sm" variant="ghost">
            Small ghost
          </Button>
          <Button disabled>Disabled</Button>
          <Button href="#button-link" variant="secondary" icon="chevron-right">
            Link button
          </Button>
        </div>
        <Button fullWidth icon="scale">
          Full width
        </Button>
      </Section>

      <Section title="Badge">
        <div className="ds-row">
          <Badge tone="success">Paid</Badge>
          <Badge tone="warning">Pending sync</Badge>
          <Badge tone="danger">Disputed</Badge>
          <Badge tone="info">Offline · 3 h</Badge>
          <Badge>Draft</Badge>
        </div>
      </Section>

      <Section title="IdTag">
        <div className="ds-row">
          <IdTag value="TLF-KCO-FMR-0004817" />
          <IdTag value="TG-043" />
          <IdTag value="TLF-KCO-FAC-000014" copyable={false} />
          <IdTag value="TLF-KCO-FMR-0004817" copyLabel="Nakili" copiedLabel="Imenakiliwa" />
          <span className="ds-note">Kiswahili copy labels</span>
        </div>
      </Section>

      <Section title="Card">
        <div className="ds-grid">
          <Card title="Quality by buying centre" subtitle="This month" action={<Button size="sm" variant="ghost">View</Button>}>
            <p>Card with title, subtitle and one action.</p>
          </Card>
          <Card>
            <p>Card with no header.</p>
          </Card>
          <Card title="Card title as h2" titleLevel={2} subtitle="titleLevel={2}, same look">
            <p>Use after a page h1 so no heading level is skipped.</p>
          </Card>
        </div>
      </Section>

      <Section title="StatCard">
        <div className="ds-grid">
          <StatCard label="Kilos this month" value={<span className="tl-num">284,310</span>} unit="kg" delta={6.2} />
          <StatCard label="Open disputes" value="5" delta={-12} deltaLabel="vs last week" />
          <StatCard label="Factories" value="6" />
        </div>
      </Section>

      <Section title="QualityMeter">
        <div className="ds-meters">
          <QualityMeter value={66} />
          <QualityMeter value={57.3} label="Kiptere fine leaf" />
          <QualityMeter value={60} />
          <QualityMeter value={59} label="One point below" />
          <QualityMeter value={0} label="No sample" />
          <QualityMeter value={100} target={70} label="Custom target 70%" />
          <QualityMeter value={54} label="Ubora wa majani" caption="Alama 6 chini ya lengo la 60%" ariaLabel="Ubora wa majani 54%, lengo 60%" />
        </div>
      </Section>

      <Section title="TextField, SelectField, TextAreaField">
        <div className="ds-grid">
          <TextField id={`${p}-name`} label="Farmer name" placeholder="e.g. Chebet Koech" />
          <TextField id={`${p}-num`} label="Farmer number" hint="Unique within the buying centre" defaultValue="124" />
          <TextField id={`${p}-kg`} label="Kilos" type="number" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} error={kgError} />
          <TextField id={`${p}-dis`} label="Scale ID" value="SCL-TG043-02" disabled readOnly />
          <SelectField id={`${p}-bc`} label="Buying centre" defaultValue="TG-043" hint="Select one">
            <option value="TG-043">TG-043 Kapsoit</option>
            <option value="TG-044">TG-044 Ainamoi</option>
            <option value="TG-051">TG-051 Kiptere</option>
          </SelectField>
          <SelectField id={`${p}-reason`} label="Reason" defaultValue="" error="Choose a reason">
            <option value="" disabled>
              Choose…
            </option>
            <option value="weight">Weight is wrong</option>
          </SelectField>
        </div>
        <TextAreaField id={`${p}-note`} label="Note" hint="Tell the factory what happened." placeholder="My scale showed 34 kg" />
      </Section>

      <Section title="Alert">
        <Alert tone="success" title="Delivery saved">
          412 kg added to TG-043. The farmer will get an SMS.
        </Alert>
        <Alert tone="warning" title="TG-051 Kiptere is offline">
          14 deliveries are waiting to sync.
        </Alert>
        <Alert tone="danger" title="Day 16 Oct 2026 does not match its seal">
          Expected 1,204.6 kg, found 1,212.6 kg.
        </Alert>
        <Alert tone="info">Farmer-level records stay with each factory.</Alert>
      </Section>

      <Section title="DataTable">
        <DataTable columns={COLUMNS} rows={ROWS} caption="Static table" />
        <DataTable columns={COLUMNS} rows={ROWS} caption="Clickable rows (onRowClick, Enter or Space)" onRowClick={(r) => setOpened(r.id)} />
        <div aria-live="polite">{opened ? <Alert tone="info">Opened {opened}</Alert> : null}</div>
        <DataTable columns={COLUMNS} rows={[]} loading caption="Loading" loadingRows={3} />
        <DataTable columns={COLUMNS} rows={[]} caption="Empty" emptyMessage="No deliveries match these filters." />
        <DataTable columns={COLUMNS} rows={[]} caption="Empty (default message)" />
      </Section>

      <Section title="LeafIllustration">
        <div className="ds-grid">
          <LeafIllustration size="md" caption="IMG-TG043-20261023-0412" note="illustration, photos are not stored in this demo" />
          <LeafIllustration size="sm" label="Picha ya sampuli ya majani (mchoro)" caption="IMG-TG043-20261023-0413" />
          <LeafIllustration size="sm" />
        </div>
      </Section>

      <Section title="Toast (ToastProvider + useToast; static placement here)">
        <ToastProvider placement="static" dismissLabel={theme === 'light' ? 'Dismiss' : 'Funga'}>
          <ToastDemo />
        </ToastProvider>
        <span className="ds-note">Static examples of each tone:</span>
        <Toast placement="static" tone="success" message="Delivery saved" />
        <Toast placement="static" tone="info" message="3 deliveries synced" onDismiss={() => undefined} />
        <Toast placement="static" tone="warning" message="Saved offline" onDismiss={() => undefined} dismissLabel="Funga" />
        <Toast placement="static" tone="danger" message="Could not save the delivery" onDismiss={() => undefined} />
      </Section>

      <Section title="Skeleton and Spinner">
        <div className="ds-skeletons">
          <Skeleton width="60%" />
          <Skeleton />
          <Skeleton height={44} />
        </div>
        <Spinner label="Loading deliveries…" />
      </Section>

      <Section title="ThemeToggle (switches and saves the page theme)">
        <div className="ds-row">
          <ThemeToggle />
          <ThemeToggle labels={{ light: 'Mwanga', dark: 'Giza' }} groupLabel="Mandhari ya rangi" />
          <span className="ds-note">Custom labels (Kiswahili)</span>
        </div>
      </Section>

      <Section title="Sidebar (NavLink items; click to see the active state move)">
        <div className="ds-sidebars">
          <div className="ds-sidebar-frame">
            <Sidebar orgName="Tegat Tea Factory" orgSubtitle="TLF-KCO-FAC-000014" groups={SIDEBAR_GROUPS} />
          </div>
          <div className="ds-sidebar-frame">
            <Sidebar
              orgName="Kericho County Government"
              orgSubtitle="TLF-KCO"
              logoUrl={twoleafIconUrl}
              groups={SIDEBAR_GROUPS.slice(0, 1)}
              footer={<span className="ds-note">Custom footer slot</span>}
            />
          </div>
        </div>
      </Section>

      <Section title="PoweredBy and Footer">
        <PoweredBy />
        <Footer links={[{ label: 'Privacy' }, { label: 'Terms' }, { label: 'Help' }]} />
      </Section>
    </div>
  );
}

export function DesignPage() {
  return (
    <div className="ds-page">
      <header className="ds-header">
        <div className="ds-header-brand">
          <img src={twoleafIconUrl} alt="" />
          <div>
            <h1 className="h1">TwoLeaf design system</h1>
            <p>Every component and state, in the light and dark themes.</p>
          </div>
        </div>
        <ThemeToggle />
      </header>
      <div className="ds-panels">
        <Gallery theme="light" />
        <Gallery theme="dark" />
      </div>
    </div>
  );
}
