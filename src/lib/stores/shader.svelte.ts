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
  | 'noise';

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
    icon: '○',
    description: 'No procedural shader',
    params: {},
  },
  manga: {
    id: 'manga',
    label: 'Manga',
    icon: '≡',
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
    icon: '⠿',
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
    icon: '▦',
    description: 'Hard alternating squares tinted by scene color',
    params: {
      scale: { label: 'Scale', min: 2, max: 80, step: 1, default: 20 },
      intensity: { label: 'Intensity', min: 0, max: 1, step: 0.01, default: 0.85 },
    },
  },
  gradient: {
    id: 'gradient',
    label: 'Gradient',
    icon: '▓',
    description: 'Vertical luminance gradient overlay',
    params: {
      intensity: { label: 'Intensity', min: 0, max: 1, step: 0.01, default: 0.7 },
    },
  },
  hatch_gradient: {
    id: 'hatch_gradient',
    label: 'Hatch Grad',
    icon: '▤',
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
    icon: '🔲',
    description: 'Posterization / cel shading effect',
    params: {
      intensity: { label: 'Intensity', min: 0, max: 1, step: 0.01, default: 0.7 },
      steps: { label: 'Steps', min: 2, max: 16, step: 1, default: 5 },
    },
  },
  crosshatch: {
    id: 'crosshatch',
    label: 'Crosshatch',
    icon: '⌗',
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
    icon: '∴',
    description: 'Animated film-grain procedural noise overlay',
    params: {
      intensity: { label: 'Intensity', min: 0, max: 1, step: 0.01, default: 0.25 },
      scale: { label: 'Scale', min: 50, max: 1000, step: 10, default: 300 },
    },
  },
  sketch: {
    id: 'sketch',
    label: 'Sketch',
    icon: '✎',
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
    icon: '⛶',
    description: 'Retro Bayer matrix 4x4 dither',
    params: {
      scale: { label: 'Scale', min: 1, max: 8, step: 1, default: 2 },
      intensity: { label: 'Intensity', min: 0, max: 1, step: 0.01, default: 0.8 },
    },
  },
  stipple: {
    id: 'stipple',
    label: 'Stipple',
    icon: '░',
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
    icon: '💧',
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
    icon: '〰',
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
    icon: '📄',
    description: 'Fine paper grain overlaid on the scene — clean white noise, no banding',
    params: {
      scale: { label: 'Grain Size', min: 100, max: 1500, step: 50, default: 700 },
      paper: { label: 'Strength', min: 0, max: 1, step: 0.05, default: 0.5 },
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

// ---------------------------------------------------------------------------
// Reactive State (Svelte 5 Runes)
// ---------------------------------------------------------------------------

let active = $state<ShaderType>('none');
let params = $state<ShaderParams>(buildDefaultParams());

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
}

function saveActive(type: ShaderType): void {
  // Deliberately no-op: shaders shouldn't persist across page reloads
}

function saveParams(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_PARAMS, JSON.stringify(params));
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
};

/** Initialize the shader system. Call once on app mount. */
export function initShader(): void {
  loadFromStorage();
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
