/**
 * Theme Store — PerspX
 *
 * Manages base theme (dark | light | black | transparent)
 * and accent hue (0–360) with localStorage persistence.
 *
 * Usage:
 *   import { themeStore, setTheme, setAccentHue, cycleTheme } from '$lib/stores/theme';
 *   themeStore.mode   // current theme name
 *   themeStore.accentHue // current accent hue (0–360)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ThemeMode = 'dark' | 'light' | 'black' | 'transparent';

export interface AccentPreset {
	name: string;
	hue: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY_THEME = 'perspx-theme';
const STORAGE_KEY_ACCENT = 'perspx-accent-hue';
const DEFAULT_THEME: ThemeMode = 'dark';
const DEFAULT_ACCENT_HUE = 217; // Blue

export const THEME_MODES: ThemeMode[] = ['dark', 'light', 'black', 'transparent'];

export const ACCENT_PRESETS: AccentPreset[] = [
	{ name: 'Blue', hue: 217 },
	{ name: 'Purple', hue: 270 },
	{ name: 'Teal', hue: 174 },
	{ name: 'Orange', hue: 25 },
	{ name: 'Rose', hue: 345 },
	{ name: 'Green', hue: 142 },
	{ name: 'Amber', hue: 45 },
	{ name: 'Cyan', hue: 190 },
	{ name: 'Red', hue: 0 },
];

// ---------------------------------------------------------------------------
// Reactive State (Svelte 5 Runes)
// ---------------------------------------------------------------------------

let mode = $state<ThemeMode>(DEFAULT_THEME);
let accentHue = $state<number>(DEFAULT_ACCENT_HUE);

// ---------------------------------------------------------------------------
// DOM Helpers
// ---------------------------------------------------------------------------

function applyThemeToDOM(theme: ThemeMode): void {
	if (typeof document === 'undefined') return;
	document.documentElement.setAttribute('data-theme', theme);
}

function applyAccentToDOM(hue: number): void {
	if (typeof document === 'undefined') return;
	document.documentElement.style.setProperty('--accent-hue', String(hue));
}

// ---------------------------------------------------------------------------
// Persistence Helpers
// ---------------------------------------------------------------------------

function loadFromStorage(): { theme: ThemeMode; hue: number } {
	if (typeof localStorage === 'undefined') {
		return { theme: DEFAULT_THEME, hue: DEFAULT_ACCENT_HUE };
	}

	const storedTheme = localStorage.getItem(STORAGE_KEY_THEME) as ThemeMode | null;
	const storedHue = localStorage.getItem(STORAGE_KEY_ACCENT);

	return {
		theme: storedTheme && THEME_MODES.includes(storedTheme) ? storedTheme : DEFAULT_THEME,
		hue: storedHue ? Number(storedHue) : DEFAULT_ACCENT_HUE,
	};
}

function saveTheme(theme: ThemeMode): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY_THEME, theme);
}

function saveAccentHue(hue: number): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY_ACCENT, String(hue));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Reactive theme store — read `themeStore.mode` and `themeStore.accentHue` */
export const themeStore = {
	get mode() {
		return mode;
	},
	get accentHue() {
		return accentHue;
	},
};

/** Initialize the theme system. Call once on app mount. */
export function initTheme(): void {
	const stored = loadFromStorage();
	mode = stored.theme;
	accentHue = stored.hue;
	applyThemeToDOM(mode);
	applyAccentToDOM(accentHue);
}

/** Set the base theme. */
export function setTheme(newMode: ThemeMode): void {
	mode = newMode;
	applyThemeToDOM(newMode);
	saveTheme(newMode);
}

/** Set the accent hue (0–360). */
export function setAccentHue(hue: number): void {
	const clamped = ((hue % 360) + 360) % 360;
	accentHue = clamped;
	applyAccentToDOM(clamped);
	saveAccentHue(clamped);
}

/** Cycle to the next theme in order. */
export function cycleTheme(): void {
	const currentIndex = THEME_MODES.indexOf(mode);
	const nextIndex = (currentIndex + 1) % THEME_MODES.length;
	setTheme(THEME_MODES[nextIndex]);
}
