import { cx } from '../cx';
import { useTheme, type Theme } from '../theme';
import { Icon } from './Icon';

export interface ThemeToggleProps {
  /** Optional: force the pressed state (controlled). Without it the toggle shows the current theme. */
  value?: Theme;
  onChange?: (theme: Theme) => void;
  /** Button text, e.g. Kiswahili in the farmer and plucker apps. Default "Light" / "Dark". */
  labels?: ThemeToggleLabels;
  /** Accessible name of the button group (read by screen readers). Default "Colour theme". */
  groupLabel?: string;
  className?: string;
}

export interface ThemeToggleLabels {
  light: string;
  dark: string;
}

const DEFAULT_LABELS: ThemeToggleLabels = { light: 'Light', dark: 'Dark' };

const THEMES: Theme[] = ['light', 'dark'];

/**
 * Sets `data-theme` on <html> and saves the choice under `twoleaf-theme`.
 * With no saved choice the theme follows `prefers-color-scheme`.
 * Every ThemeToggle on the page shares one store, so they stay in sync.
 */
export function ThemeToggle({ value, onChange, labels = DEFAULT_LABELS, groupLabel = 'Colour theme', className }: ThemeToggleProps) {
  const [current, setTheme] = useTheme();
  const theme = value ?? current;

  function pick(t: Theme): void {
    setTheme(t);
    onChange?.(t);
  }

  return (
    <div className={cx('tl-toggle', className)} role="group" aria-label={groupLabel}>
      {THEMES.map((t) => (
        <button key={t} type="button" aria-pressed={theme === t ? 'true' : 'false'} onClick={() => pick(t)}>
          <Icon name={t === 'light' ? 'sun' : 'moon'} />
          {labels[t]}
        </button>
      ))}
    </div>
  );
}
