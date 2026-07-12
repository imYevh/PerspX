/**
 * App Mode Store — PerspX
 *
 * Manages application mode: 'desktop' (full-featured) or 'compact' (mobile-friendly).
 * Persists to localStorage and applies `data-app-mode` attribute to <html>.
 *
 * Usage:
 *   import { appModeStore, setAppMode, initAppMode } from '$lib/stores/appMode.svelte';
 *   appModeStore.mode  // 'desktop' | 'compact'
 *   setAppMode('compact')
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AppMode = 'desktop' | 'compact';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'perspx-app-mode';
const DEFAULT_MODE: AppMode = 'desktop';

export const APP_MODES: AppMode[] = ['desktop', 'compact'];

export const APP_MODE_LABELS: Record<AppMode, string> = {
  desktop: 'Desktop (Full)',
  compact: 'Mobile (Compact)',
};

export const APP_MODE_DESCRIPTIONS: Record<AppMode, string> = {
  desktop: 'Full-featured editor with all panels, lights, and post-processing effects.',
  compact: 'Simplified view: single 3D object, sun-only lighting, minimal UI. Best for mobile.',
};

// ---------------------------------------------------------------------------
// Reactive State (Svelte 5 Runes)
// ---------------------------------------------------------------------------

let mode = $state<AppMode>(DEFAULT_MODE);

// ---------------------------------------------------------------------------
// DOM Helpers
// ---------------------------------------------------------------------------

function applyModeToDOM(appMode: AppMode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-app-mode', appMode);
}

// ---------------------------------------------------------------------------
// Persistence Helpers
// ---------------------------------------------------------------------------

function loadFromStorage(): AppMode {
  if (typeof localStorage === 'undefined') return DEFAULT_MODE;
  const stored = localStorage.getItem(STORAGE_KEY) as AppMode | null;
  return stored && APP_MODES.includes(stored) ? stored : DEFAULT_MODE;
}

function saveMode(appMode: AppMode): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, appMode);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Reactive app mode store */
export const appModeStore = {
  get mode(): AppMode {
    return mode;
  },
};

/** Initialize the app mode system. Call once on app mount. */
export function initAppMode(): void {
  mode = loadFromStorage();
  applyModeToDOM(mode);
}

/** Set the application mode. Dispatches 'perspx-mode-changed' on window. */
export function setAppMode(newMode: AppMode): void {
  const previousMode = mode;
  mode = newMode;
  applyModeToDOM(newMode);
  saveMode(newMode);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('perspx-mode-changed', {
        detail: { mode: newMode, previousMode },
      })
    );
  }
}

/** Check if current mode is compact */
export function isCompactMode(): boolean {
  return mode === 'compact';
}
