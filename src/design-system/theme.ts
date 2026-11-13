import { useCallback, useSyncExternalStore } from 'react';

/**
 * Theme store shared by every ThemeToggle and by `useTheme()`.
 *
 * - The theme lives on `<html data-theme="light|dark">`.
 * - On first load, with no saved choice, the demo starts in the light theme.
 *   The device's `prefers-color-scheme` is deliberately ignored.
 * - Once the person picks a theme it is saved under `twoleaf-theme` and that
 *   remembered choice wins on every later load.
 *
 * `index.html` runs the same logic inline before first paint, so there is no flash.
 */
export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'twoleaf-theme';

function isTheme(v: unknown): v is Theme {
  return v === 'light' || v === 'dark';
}

export function readStoredTheme(): Theme | null {
  try {
    const v = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(v) ? v : null;
  } catch {
    return null;
  }
}

function initialTheme(): Theme {
  const attr = document.documentElement.getAttribute('data-theme');
  if (isTheme(attr)) return attr;
  return readStoredTheme() ?? 'light';
}

let current: Theme | null = null;
const listeners = new Set<() => void>();

function apply(theme: Theme): void {
  current = theme;
  document.documentElement.setAttribute('data-theme', theme);
  listeners.forEach((l) => l());
}

export function getTheme(): Theme {
  if (current === null) {
    current = initialTheme();
    document.documentElement.setAttribute('data-theme', current);
  }
  return current;
}

/** Applies the theme to `<html>` and saves the choice under `twoleaf-theme`. */
export function setTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable (private mode); the theme still applies for this session.
  }
  apply(theme);
}

function subscribe(listener: () => void): () => void {
  getTheme();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Current theme plus a setter that saves the choice. */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, getTheme, () => 'light' as Theme);
  const set = useCallback((t: Theme) => setTheme(t), []);
  return [theme, set];
}
