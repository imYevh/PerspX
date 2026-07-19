/**
 * Shader Store — PerspX
 *
 * Manages the active procedural shader (manga, halftone, checkerboard, etc.)
 * and per-shader parameters, with localStorage persistence.
 *
 * Only one shader can be active at a time. Selecting the active shader again
 * turns it off (toggles back to 'none').
 *
 * Usage:
 *   import { shaderStore, setShader, setShaderParam } from '$lib/stores/shader.svelte';
 *   shaderStore.active   // current shader type
 *   shaderStore.params   // per-shader params
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ShaderType =
  | 'none'
  | 'manga'
  | 'halftone'
  | 'checkerboard'
  | 'gradient'
  | 'hatch_gradient'
  | 'cartoon'
  | 'crosshatch'
  | 'sketch'
  | 'dither'
  | 'stipple'
  | 'watercolor'
  | 'refraction'
  | 'paper'
  | 'noise'
  | 'gradient_blur'
  | 'pixelate'
  | 'sobel'
  | 'duotone';

export interface ShaderParamDef {
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface ShaderDef {
  id: ShaderType;
  label: string;
  icon: string;
  description: string;
  params: Record<string, ShaderParamDef>;
}

export type ShaderParams = Record<ShaderType, Record<string, number>>;

// ---------------------------------------------------------------------------
// Shader Definitions
// ---------------------------------------------------------------------------

export const SHADER_DEFS: Record<ShaderType, ShaderDef> = {
  none: {
    id: 'none',
    label: 'None',
    icon: 'N',
    description: 'No procedural shader',
    params: {},
  },
  manga: {
    id: 'manga',
    label: 'Manga',
    icon: 'M',
    description: 'Diagonal hatch lines — density driven by scene luminance',
    params: {
      scale: { label: 'Scale', min: 50, max: 800, step: 10, default: 300 },
      angle: { label: 'Angle °', min: 0, max: 180, step: 1, default: 45 },
      intensity: { label: 'Intensity', min: 0, max: 1, step: 0.01, default: 0.9 },
      threshold: { label: 'Threshold', min: 0, max: 1, step: 0.01, default: 0.5 },
    },
  },
  halftone: {
    id: 'halftone',
    label: 'Halftone',
    icon: 'H',
    description: 'Dot-grid pattern — dot size driven by luminance',
    params: {
      scale: { label: 'Scale', min: 20, max: 400, step: 5, default: 120 },
      intensity: { label: 'Intensity', min: 0, max: 1, step: 0.01, default: 0.9 },
      softness: { label: 'Softness', min: 0, max: 1, step: 0.01, default: 0.15 },
    },
  },
  checkerboard: {
    id: 'checkerboard',
    label: 'Checker',
    icon: 'C',
    description: 'Hard alternating squares tinted by scene color',
    params: {
      scale: { label: 'Scale', min: 2, max: 80, step: 1, default: 20 },
      intensity: { label: 'Intensity', min: 0, max: 1, step: 0.01, default: 0.85 },
    },
  },
  gradient: {
    id: 'gradient',
    label: 'Gradient',
    icon: 'G',
    description: 'Vertical luminance gradient overlay',
    params: {
      intensity: { label: 'Intensity', min: 0, max: 1, step: 0.01, default: 0.7 },
    },
  },
  hatch_gradient: {
    id: 'hatch_gradient',
    label: 'Hatch Grad',
    icon: 'HG',
    description: 'Vertical gradient made of hatching lines',
    params: {
      scale: { label: 'Scale', min: 50, max: 800, step: 10, default: 200 },
      angle: { label: 'Angle °', min: 0, max: 180, step: 1, default: 0 },
      intensity: { label: 'Intensity', min: 0, max: 1, step: 0.01, default: 0.9 },
    },
  },
  cartoon: {
    id: 'cartoon',
    label: 'Cartoon',
    icon: 'Ca',
    description: 'Posterization / cel shading effect',
    params: {
      intensity: { label: 'Intensity', min: 0, max: 1, step: 0.01, default: 0.7 },
      steps: { label: 'Steps', min: 2, max: 16, step: 1, default: 5 },
    },
  },
  crosshatch: {
    id: 'crosshatch',
    label: 'Crosshatch',
    icon: 'Cr',
    description: 'Bi-directional hatching perpendicular lines',
    params: {
      scale: { label: 'Scale', min: 50, max: 800, step: 10, default: 250 },
      intensity: { label: 'Intensity', min: 0, max: 1, step: 0.01, default: 0.9 },
      threshold: { label: 'Threshold', min: 0, max: 1, step: 0.01, default: 0.55 },
    },
  },
  noise: {
    id: 'noise',
    label: 'Grain',
    icon: 'Gr',
    description: 'Animated film-grain procedural noise overlay',
    params: {
      intensity: { label: 'Intensity', min: 0, max: 1, step: 0.01, default: 0.25 },
      scale: { label: 'Scale', min: 50, max: 1000, step: 10, default: 300 },
    },
  },
  sketch: {
    id: 'sketch',
    label: 'Sketch',
    icon: 'S',
    description: 'Hand-drawn pencil contours and outlines',
    params: {
      thickness: { label: 'Thickness', min: 1, max: 8, step: 0.5, default: 2 },
      roughness: { label: 'Roughness', min: 0, max: 20, step: 0.5, default: 5 },
      intensity: { label: 'Intensity', min: 0, max: 1, step: 0.01, default: 0.9 },
    },
  },
  dither: {
    id: 'dither',
    label: 'Dither',
    icon: 'D',
    description: 'Retro Bayer matrix 4x4 dither',
    params: {
      scale: { label: 'Scale', min: 1, max: 8, step: 1, default: 2 },
      intensity: { label: 'Intensity', min: 0, max: 1, step: 0.01, default: 0.8 },
    },
  },
  stipple: {
    id: 'stipple',
    label: 'Stipple',
    icon: 'St',
    description: 'Organic pointillistic ink dots',
    params: {
      scale: { label: 'Scale', min: 50, max: 800, step: 10, default: 300 },
      density: { label: 'Density', min: 0, max: 2, step: 0.05, default: 1.0 },
      intensity: { label: 'Intensity', min: 0, max: 1, step: 0.01, default: 0.9 },
    },
  },
  watercolor: {
    id: 'watercolor',
    label: 'Watercolor',
    icon: 'W',
    description: 'Paint bleed at edges, paper grain, pigment pooling at contours',
    params: {
      bleed: { label: 'Bleed', min: 1, max: 15, step: 0.5, default: 5 },
      paper: { label: 'Paper', min: 0, max: 1, step: 0.05, default: 0.15 },
      intensity: { label: 'Intensity', min: 0, max: 1, step: 0.01, default: 0.85 },
    },
  },
  refraction: {
    id: 'refraction',
    label: 'Refraction',
    icon: 'R',
    description: 'Glass / water surface distortion — objects seen through a liquid lens',
    params: {
      scale: { label: 'Frequency', min: 5, max: 80, step: 1, default: 18 },
      bleed: { label: 'Strength', min: 1, max: 20, step: 0.5, default: 8 },
      intensity: { label: 'Intensity', min: 0, max: 1, step: 0.01, default: 0.85 },
    },
  },
  paper: {
    id: 'paper',
    label: 'Paper',
    icon: 'P',
    description: 'Fine paper grain overlaid on the scene — clean white noise, no banding',
    params: {
      scale: { label: 'Grain Size', min: 100, max: 1500, step: 50, default: 700 },
      paper: { label: 'Strength', min: 0, max: 1, step: 0.05, default: 0.5 },
      intensity: { label: 'Intensity', min: 0, max: 1, step: 0.01, default: 0.9 },
    },
  },
  gradient_blur: {
    id: 'gradient_blur',
    label: 'Gradient',
    icon: 'G',
    description: 'Fades the scene to transparent along a direction, revealing the background',
    params: {
      position: { label: 'Position %', min: -50, max: 150, step: 1, default: 80 },
      length: { label: 'Length %', min: 0, max: 100, step: 1, default: 20 },
      angle: { label: 'Angle °', min: 0, max: 360, step: 1, default: 270 },
      intensity: { label: 'Opacity', min: 0, max: 1, step: 0.01, default: 1.0 },
    },
  },
  pixelate: {
    id: 'pixelate',
    label: 'Pixelate',
    icon: 'Px',
    description: 'Downsamples the image to give a low-resolution pixel art look',
    params: {
      size: { label: 'Block Size', min: 2, max: 64, step: 1, default: 8 },
    },
  },
  sobel: {
    id: 'sobel',
    label: 'Sobel Edge',
    icon: 'SE',
    description: 'Highlights the edges of objects in the scene',
    params: {
      thickness: { label: 'Thickness', min: 0.5, max: 5, step: 0.1, default: 1.0 },
      intensity: { label: 'Intensity', min: 0, max: 1, step: 0.01, default: 0.9 },
    },
  },
  duotone: {
    id: 'duotone',
    label: 'Duotone',
    icon: '◩',
    description: 'Remaps the image to a two-color palette based on luminance',
    params: {
      hue1: { label: 'Dark Hue °', min: 0, max: 360, step: 1, default: 220 },
      hue2: { label: 'Light Hue °', min: 0, max: 360, step: 1, default: 40 },
      threshold: { label: 'Threshold', min: 0, max: 1, step: 0.01, default: 0.5 },
      intensity: { label: 'Intensity', min: 0, max: 1, step: 0.01, default: 0.9 },
    },
  },
};

export const SHADER_ORDER: ShaderType[] = [
  'manga',
  'halftone',
  'checkerboard',
  'gradient',
  'hatch_gradient',
  'cartoon',
  'crosshatch',
  'sketch',
  'dither',
  'stipple',
  'watercolor',
  'refraction',
  'paper',
  'noise',
  'gradient_blur',
  'pixelate',
  'sobel',
  'duotone',
];

// ---------------------------------------------------------------------------
// Default Params
// ---------------------------------------------------------------------------

function buildDefaultParams(): ShaderParams {
  const params: Partial<ShaderParams> = {};
  for (const [id, def] of Object.entries(SHADER_DEFS)) {
    const p: Record<string, number> = {};
    for (const [key, paramDef] of Object.entries(def.params)) {
      p[key] = paramDef.default;
    }
    params[id as ShaderType] = p;
  }
  return params as ShaderParams;
}

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------

const STORAGE_KEY_ACTIVE = 'perspx-shader-active';
const STORAGE_KEY_PARAMS = 'perspx-shader-params';
const STORAGE_KEY_SETTINGS = 'perspx-shader-settings';

// ---------------------------------------------------------------------------
// Reactive State (Svelte 5 Runes)
// ---------------------------------------------------------------------------

let active = $state<ShaderType>('none');
let params = $state<ShaderParams>(buildDefaultParams());
let previews = $state<Partial<Record<ShaderType, string>>>({});
let previewsLoading = $state(false);
let use3DPreviews = $state(false);

// ---------------------------------------------------------------------------
// Persistence Helpers
// ---------------------------------------------------------------------------

function loadFromStorage(): void {
  if (typeof localStorage === 'undefined') return;

  // Clean up any previously stored active shader so it doesn't persist
  localStorage.removeItem(STORAGE_KEY_ACTIVE);

  const storedParams = localStorage.getItem(STORAGE_KEY_PARAMS);
  if (storedParams) {
    try {
      const parsed = JSON.parse(storedParams) as Partial<ShaderParams>;
      const defaults = buildDefaultParams();
      // Merge stored values on top of defaults to handle new params added after save
      for (const [id, p] of Object.entries(parsed)) {
        if (id in defaults) {
          defaults[id as ShaderType] = { ...defaults[id as ShaderType], ...p };
        }
      }
      params = defaults;
    } catch {
      // ignore corrupt storage
    }
  }

  const storedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
  if (storedSettings) {
    try {
      const parsed = JSON.parse(storedSettings);
      if (typeof parsed.use3DPreviews === 'boolean') {
        use3DPreviews = parsed.use3DPreviews;
      }
    } catch {
      // ignore corrupt storage
    }
  }
}

function saveActive(type: ShaderType): void {
  // Deliberately no-op: shaders shouldn't persist across page reloads
}

function saveParams(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_PARAMS, JSON.stringify(params));
}

function saveSettings(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify({ use3DPreviews }));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Reactive shader store — read `shaderStore.active` and `shaderStore.params` */
export const shaderStore = {
  get active(): ShaderType {
    return active;
  },
  get params(): ShaderParams {
    return params;
  },
  get previews(): Partial<Record<ShaderType, string>> {
    return previews;
  },
  get previewsLoading(): boolean {
    return previewsLoading;
  },
  get use3DPreviews(): boolean {
    return use3DPreviews;
  },
  set use3DPreviews(use: boolean) {
    setUse3DPreviews(use);
  }
};

/** Initialize the shader system. Call once on app mount. */
export function initShader(): void {
  loadFromStorage();
}

/** Initialize the shader cube previews. Call when dropdown is opened. */
export async function initShaderPreviews(): Promise<void> {
  if (previewsLoading || Object.keys(previews).length > 0) return;
  previewsLoading = true;
  try {
    const { generateShaderPreviews } = await import('$lib/materials/shader-previews');
    const generated = await generateShaderPreviews();
    previews = generated;
  } catch (err) {
    console.error('Failed to generate shader previews:', err);
  } finally {
    previewsLoading = false;
  }
}

/** Set whether to use 3D cube previews */
export function setUse3DPreviews(use: boolean): void {
  use3DPreviews = use;
  saveSettings();
  if (use) {
    initShaderPreviews();
  }
}

/**
 * Set the active shader. If the same type is already active, it toggles off (sets 'none').
 */
export function setShader(type: ShaderType): void {
  if (type === active) {
    active = 'none';
    saveActive('none');
  } else {
    active = type;
    saveActive(type);
  }
}

/**
 * Set a parameter for the active shader.
 */
export function setShaderParam(key: string, value: number): void {
  if (active === 'none') return;
  params = {
    ...params,
    [active]: {
      ...params[active],
      [key]: value,
    },
  };
  saveParams();
}

/**
 * Get the params for the current active shader as a plain object.
 */
export function getActiveParams(): Record<string, number> {
  if (active === 'none') return {};
  return { ...params[active] };
}

/**
 * Reset shaders to none and restore default parameters.
 */
export function resetShaders(): void {
  active = 'none';
  saveActive('none');
  params = buildDefaultParams();
  saveParams();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('perspx-shader-changed', {
      detail: { type: 'none', params: {} }
    }));
  }
}
