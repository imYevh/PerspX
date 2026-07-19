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

export type ThemeMode = 'default' | 'dark' | 'light' | 'black' | 'liquid' | 'grey' | 'chromatic';

export interface AccentPreset {
	name: string;
	hue: number;
	saturation?: number;
	lightness?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY_THEME = 'perspx-theme';
const STORAGE_KEY_ACCENT = 'perspx-accent-hue';
const DEFAULT_THEME: ThemeMode = 'default';
const DEFAULT_ACCENT_HUE = 217; // Blue

export const THEME_MODES: ThemeMode[] = ['default', 'dark', 'light', 'grey', 'black', 'liquid', 'chromatic'];

export const ACCENT_PRESETS: AccentPreset[] = [
	{ name: 'White', hue: 0, saturation: 0, lightness: 100 },
	{ name: 'Red', hue: 0 },
	{ name: 'Orange', hue: 25 },
	{ name: 'Amber', hue: 45 },
	{ name: 'Green', hue: 142 },
	{ name: 'Teal', hue: 174 },
	{ name: 'Cyan', hue: 190 },
	{ name: 'Blue', hue: 217 },
	{ name: 'Purple', hue: 270 },
	{ name: 'Rose', hue: 345 },
	{ name: 'Black', hue: 0, saturation: 0, lightness: 15 },
];

// ---------------------------------------------------------------------------
// Reactive State (Svelte 5 Runes)
// ---------------------------------------------------------------------------

let mode = $state<ThemeMode>(DEFAULT_THEME);
let accentHue = $state<number>(DEFAULT_ACCENT_HUE);
let accentSaturation = $state<number | null>(null);
let accentLightness = $state<number | null>(null);

// ---------------------------------------------------------------------------
// DOM Helpers
// ---------------------------------------------------------------------------

function updateAccentTextColor(lit: number | null, currentMode: ThemeMode, hue?: number): void {
	if (typeof document === 'undefined') return;
	let effectiveLit = lit;
	if (effectiveLit === null) {
		const isLight = currentMode === 'light';
		const isChromatic = currentMode === 'chromatic';
		effectiveLit = isChromatic ? 45 : (isLight ? 50 : 64);
	}
	// Yellow/amber/green hues (30-180) are perceptually brighter — use lower threshold
	const effectiveHue = hue ?? 217;
	const isPerceptuallyBright = effectiveHue >= 30 && effectiveHue <= 180;
	const threshold = isPerceptuallyBright ? 55 : 70;
	if (effectiveLit > threshold) {
		document.documentElement.style.setProperty('--color-accent-text', '#111111');
	} else {
		document.documentElement.style.setProperty('--color-accent-text', '#ffffff');
	}
}

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
	get accentSaturation() {
		return accentSaturation;
	},
	get accentLightness() {
		return accentLightness;
	},
};

/** Initialize the theme system. Call once on app mount. */
export function initTheme(): void {
	const stored = loadFromStorage();
	mode = stored.theme;
	accentHue = stored.hue;
	
	if (typeof localStorage !== 'undefined') {
		const sat = localStorage.getItem('perspx-accent-sat');
		const lit = localStorage.getItem('perspx-accent-lit');
		accentSaturation = sat ? Number(sat) : null;
		accentLightness = lit ? Number(lit) : null;
	}

	applyThemeToDOM(mode);
	applyAccentToDOM(accentHue);

	if (typeof document !== 'undefined') {
		if (accentSaturation !== null) {
			document.documentElement.style.setProperty('--accent-saturation', accentSaturation + '%');
		}
		if (accentLightness !== null) {
			document.documentElement.style.setProperty('--accent-lightness', accentLightness + '%');
		}
	}

	updateAccentTextColor(accentLightness, mode, accentHue);
}

/** Set the base theme. */
export function setTheme(newMode: ThemeMode): void {
	mode = newMode;
	applyThemeToDOM(newMode);
	saveTheme(newMode);
	updateAccentTextColor(accentLightness, newMode, accentHue);
}

/** Set the accent hue (0–360). */
export function setAccentHue(hue: number): void {
	const clamped = ((hue % 360) + 360) % 360;
	accentHue = clamped;
	accentSaturation = null;
	accentLightness = null;
	applyAccentToDOM(clamped);
	saveAccentHue(clamped);
	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem('perspx-accent-sat');
		localStorage.removeItem('perspx-accent-lit');
	}
	if (typeof document !== 'undefined') {
		document.documentElement.style.removeProperty('--accent-saturation');
		document.documentElement.style.removeProperty('--accent-lightness');
	}
	updateAccentTextColor(accentLightness, mode, accentHue);
}

/** Set custom accent color variables */
export function setAccent(hue: number, saturation?: number, lightness?: number): void {
	const clamped = ((hue % 360) + 360) % 360;
	accentHue = clamped;
	accentSaturation = saturation ?? null;
	accentLightness = lightness ?? null;
	
	applyAccentToDOM(clamped);
	saveAccentHue(clamped);

	if (typeof document !== 'undefined') {
		if (saturation !== undefined) {
			document.documentElement.style.setProperty('--accent-saturation', saturation + '%');
		} else {
			document.documentElement.style.removeProperty('--accent-saturation');
		}
		if (lightness !== undefined) {
			document.documentElement.style.setProperty('--accent-lightness', lightness + '%');
		} else {
			document.documentElement.style.removeProperty('--accent-lightness');
		}
	}

	updateAccentTextColor(accentLightness, mode, accentHue);

	if (typeof localStorage !== 'undefined') {
		if (saturation !== undefined) localStorage.setItem('perspx-accent-sat', String(saturation));
		else localStorage.removeItem('perspx-accent-sat');
		if (lightness !== undefined) localStorage.setItem('perspx-accent-lit', String(lightness));
		else localStorage.removeItem('perspx-accent-lit');
	}
}

/** Cycle to the next theme in order. */
export function cycleTheme(): void {
	const currentIndex = THEME_MODES.indexOf(mode);
	const nextIndex = (currentIndex + 1) % THEME_MODES.length;
	setTheme(THEME_MODES[nextIndex]);
}
