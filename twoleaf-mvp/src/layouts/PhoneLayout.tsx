/**
 * Phone layout for the clerk, farmer and plucker apps (spec section 6).
 *
 * - Wider than 700px: a 390 x 800 phone frame, centred, with a side panel that
 *   describes the role and lists a few things to try.
 * - 700px and narrower: the app fills the screen, no frame, no side panel.
 * - Inside the phone: each screen renders <PhoneScreen> (header + scrolling body);
 *   the bottom tab bar comes from <PhoneLayout>.
 *
 *   <PhoneLayout appLabel="Clerk app" tabs={tabs} side={side}>
 *     <Routes>
 *       <Route index element={<PhoneScreen title="Home">…</PhoneScreen>} />
 *     </Routes>
 *   </PhoneLayout>
 *
 * Height is `100dvh` minus the demo bar (`--demo-bar-height`, set by the demo bar).
 */
import { createContext, useContext, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Alert, Button, Icon, Skeleton, Spinner, twoleafIconUrl, type IconName } from '../design-system';
import { LANGS, LANG_LABEL, LANG_NAME, useLang, useT } from '../lib/i18n';
import './PhoneLayout.css';

export interface PhoneTab {
  /** Absolute path, e.g. `/farmer/deliveries`. */
  to: string;
  label: string;
  icon: IconName;
  /** Match the path exactly (use for the Home tab). */
  end?: boolean;
  /** Optional small count shown on the tab, e.g. pending syncs. */
  count?: number;
}

export interface PhoneSidePanel {
  /** e.g. "Buying centre clerk" */
  role: string;
  /** e.g. "Geoffrey Kirui · TG-043 Kapsoit" */
  person: string;
  /** One or two sentences on what this role does. */
  description: string;
  /** Two or three things to try in the demo. */
  tryThis: string[];
}

export interface PhoneLayoutProps {
  /** Accessible name of the phone app region, e.g. "Farmer app". */
  appLabel: string;
  tabs: PhoneTab[];
  side: PhoneSidePanel;
  /** Show the EN / SW toggle in every screen header (farmer and plucker). */
  langToggle?: boolean;
  /** The app's routes; each screen renders <PhoneScreen>. */
  children: ReactNode;
}

interface PhoneLayoutContextValue {
  langToggle: boolean;
}

const PhoneLayoutContext = createContext<PhoneLayoutContextValue>({ langToggle: false });

export function PhoneLayout({ appLabel, tabs, side, langToggle = false, children }: PhoneLayoutProps) {
  const [lang] = useLang();
  return (
    <div className="phone-stage">

      <main className="phone-frame" aria-label={appLabel} lang={langToggle ? lang : 'en'}>
        <PhoneLayoutContext.Provider value={{ langToggle }}>
          <div className="phone-main">{children}</div>
        </PhoneLayoutContext.Provider>
        <PhoneTabBar tabs={tabs} label={langToggle ? undefined : 'Main menu'} />
      </main>

      {/* After the phone in the DOM so the screen's h1 comes first; CSS shows it on the left. */}
      <aside className="phone-side" aria-label="About this role">
        <img className="phone-side-icon" src={twoleafIconUrl} alt="" width={40} height={40} />
        <p className="phone-side-role">{side.role}</p>
        <p className="phone-side-person">{side.person}</p>
        <p className="phone-side-desc">{side.description}</p>
        {side.tryThis.length > 0 ? (
          <>
            <h2 className="phone-side-try">Things to try</h2>
            <ol className="phone-side-list">
              {side.tryThis.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ol>
          </>
        ) : null}
      </aside>
    </div>
  );
}

function PhoneTabBar({ tabs, label }: { tabs: PhoneTab[]; label?: string }) {
  const t = useT();
  return (
    <nav className="phone-tabs" aria-label={label ?? t('shell.mainNav')}>
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.end} className="phone-tab">
          <span className="phone-tab-icon">
            <Icon name={tab.icon} />
            {tab.count ? (
              <span className="phone-tab-count tl-num">
                {tab.count}
                <span className="visually-hidden"> waiting</span>
              </span>
            ) : null}
          </span>
          <span className="phone-tab-label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export interface PhoneScreenProps {
  title: string;
  /** Shows a Back button: a path to go to, or a handler (e.g. previous step). */
  back?: string | (() => void);
  /** Accessible name of the Back button. Defaults to "Back" (translated when the language toggle is on). */
  backLabel?: string;
  /** Optional extra controls on the right of the header (icon buttons need aria-label). */
  actions?: ReactNode;
  children: ReactNode;
}

/** One screen inside the phone: header (title, Back, language toggle) and a scrolling body. */
export function PhoneScreen({ title, back, backLabel, actions, children }: PhoneScreenProps) {
  const { langToggle } = useContext(PhoneLayoutContext);
  const navigate = useNavigate();
  const t = useT();
  const backName = backLabel ?? (langToggle ? t('shell.back') : 'Back');

  function goBack(): void {
    if (typeof back === 'function') back();
    else if (typeof back === 'string') navigate(back);
  }

  return (
    <div className="phone-screen">
      <header className="phone-header">
        {back ? (
          <button type="button" className="phone-icon-btn" onClick={goBack} aria-label={backName}>
            <Icon name="arrow-left" />
          </button>
        ) : null}
        <h1 className="phone-title">{title}</h1>
        <div className="phone-header-actions">
          {actions}
          {langToggle ? <LangToggle /> : null}
        </div>
      </header>
      <div className="phone-body">{children}</div>
    </div>
  );
}

/** EN / SW toggle (same look as the theme toggle). */
export function LangToggle() {
  const [lang, setLang] = useLang();
  const t = useT();
  return (
    <div className="tl-toggle phone-lang" role="group" aria-label={t('shell.language')}>
      {LANGS.map((l) => (
        <button key={l} type="button" lang={l} aria-pressed={lang === l ? 'true' : 'false'} title={LANG_NAME[l]} onClick={() => setLang(l)}>
          {LANG_LABEL[l]}
        </button>
      ))}
    </div>
  );
}

export interface PhoneLoadingProps {
  /** Visible loading text (pass a translated string in farmer and plucker). */
  label?: string;
  /** Number of skeleton blocks under the spinner. */
  rows?: number;
}

/** Loading state for a phone screen: spinner plus skeleton blocks. */
export function PhoneLoading({ label = 'Loading…', rows = 3 }: PhoneLoadingProps) {
  return (
    <div className="phone-loading">
      <Spinner label={label} />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={72} />
      ))}
    </div>
  );
}

export interface PhoneErrorProps {
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}

/** Error state for a phone screen, with an optional Try again button. */
export function PhoneError({ message, retryLabel = 'Try again', onRetry }: PhoneErrorProps) {
  return (
    <Alert tone="danger">
      <p>{message}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" icon="refresh" onClick={onRetry} className="phone-retry">
          {retryLabel}
        </Button>
      ) : null}
    </Alert>
  );
}
