import type { LightConfig } from './light-manager';

export interface LightingPreset {
  name: string;
  description: string;
  lights: LightConfig[];
}

export const LIGHTING_PRESETS: Record<string, LightingPreset> = {
  studio: {
    name: 'Studio',
    description: 'Clean 3-point lighting setup for studying form',
    lights: [
      { type: 'ambient', intensity: 0.3 },
      { type: 'directional', position: [5, 8, 3], intensity: 1.0, castShadow: true },
      { type: 'directional', position: [-3, 5, -2], intensity: 0.4, castShadow: false, color: 0xaaccff },
      { type: 'point', position: [0, 2, 5], intensity: 0.3, color: 0xffeedd },
    ],
  },
  outdoor: {
    name: 'Outdoor',
    description: 'Natural sunlight with sky fill',
    lights: [
      { type: 'hemisphere', color: 0x87ceeb, groundColor: 0x362d1b, intensity: 0.6 },
      { type: 'directional', position: [10, 15, 5], intensity: 1.2, castShadow: true },
    ],
  },
  dramatic: {
    name: 'Dramatic',
    description: 'High contrast with strong directional light',
    lights: [
      { type: 'ambient', intensity: 0.1 },
      { type: 'spot', position: [3, 8, 3], intensity: 2.0, angle: 0.4, penumbra: 0.5, castShadow: true },
    ],
  },
  flat: {
    name: 'Flat',
    description: 'Even lighting with no shadows — good for clean wireframe views',
    lights: [
      { type: 'ambient', intensity: 0.8 },
      { type: 'hemisphere', intensity: 0.5 },
    ],
  },
  warm: {
    name: 'Warm Interior',
    description: 'Golden ambient with warm point lights',
    lights: [
      { type: 'ambient', color: 0x332211, intensity: 0.4 },
      { type: 'point', position: [3, 4, 0], color: 0xffaa44, intensity: 1.0 },
      { type: 'point', position: [-3, 4, 0], color: 0xff8822, intensity: 0.7 },
    ],
  },
  compact: {
    name: 'Compact Sun',
    description: 'Single directional sun light — optimised for compact / mobile mode',
    lights: [
      { type: 'ambient', intensity: 0.25 },
      {
        type: 'directional',
        position: [8, 12, 5],
        intensity: 0.9,
        castShadow: true,
        shadowMapSize: 512,
      },
    ],
  },
};
