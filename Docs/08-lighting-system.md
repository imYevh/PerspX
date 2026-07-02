# 08 — Lighting System

## Goal
Build a flexible lighting system with multiple light types, presets, and visual indicators. Lights should be manageable through the SceneManager like any other object.

---

## Light Types

| Type             | Three.js Class        | Use Case                                |
| :--------------- | :-------------------- | :-------------------------------------- |
| **Ambient**      | `AmbientLight`        | Global fill — prevents pure black areas |
| **Directional**  | `DirectionalLight`    | Sun-like parallel rays with shadows     |
| **Point**        | `PointLight`          | Omni-directional (light bulb)           |
| **Spot**         | `SpotLight`           | Focused cone of light                   |
| **Hemisphere**   | `HemisphereLight`     | Sky/ground gradient lighting            |

---

## Implementation

### `src/lighting/light-manager.ts`

```ts
import {
  AmbientLight,
  DirectionalLight,
  PointLight,
  SpotLight,
  HemisphereLight,
  Light,
  DirectionalLightHelper,
  PointLightHelper,
  SpotLightHelper,
  Object3D,
  CameraHelper,
  Color,
} from 'three';
import type { SceneManager } from '@/core/scene';

export type LightType = 'ambient' | 'directional' | 'point' | 'spot' | 'hemisphere';

export interface LightConfig {
  type: LightType;
  color?: number;
  intensity?: number;
  // Directional / Spot
  position?: [number, number, number];
  target?: [number, number, number];
  castShadow?: boolean;
  // Point / Spot
  distance?: number;
  decay?: number;
  // Spot only
  angle?: number;
  penumbra?: number;
  // Hemisphere
  groundColor?: number;
}

export class LightManager {
  private sceneManager: SceneManager;
  private helpers: Map<string, Object3D> = new Map();
  private showHelpers = true;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
  }

  addLight(config: LightConfig): string {
    let light: Light;

    switch (config.type) {
      case 'ambient':
        light = new AmbientLight(config.color ?? 0xffffff, config.intensity ?? 0.4);
        break;

      case 'directional': {
        const dirLight = new DirectionalLight(config.color ?? 0xffffff, config.intensity ?? 1.0);
        dirLight.position.set(...(config.position ?? [5, 10, 5]));
        if (config.castShadow ?? true) {
          dirLight.castShadow = true;
          dirLight.shadow.mapSize.set(2048, 2048);
          dirLight.shadow.camera.near = 0.1;
          dirLight.shadow.camera.far = 100;
          dirLight.shadow.camera.left = -20;
          dirLight.shadow.camera.right = 20;
          dirLight.shadow.camera.top = 20;
          dirLight.shadow.camera.bottom = -20;
        }
        light = dirLight;
        break;
      }

      case 'point': {
        const pointLight = new PointLight(
          config.color ?? 0xffffff,
          config.intensity ?? 1.0,
          config.distance ?? 50,
          config.decay ?? 2
        );
        pointLight.position.set(...(config.position ?? [3, 5, 3]));
        if (config.castShadow) {
          pointLight.castShadow = true;
          pointLight.shadow.mapSize.set(1024, 1024);
        }
        light = pointLight;
        break;
      }

      case 'spot': {
        const spotLight = new SpotLight(
          config.color ?? 0xffffff,
          config.intensity ?? 1.0,
          config.distance ?? 50,
          config.angle ?? Math.PI / 6,
          config.penumbra ?? 0.3,
          config.decay ?? 2
        );
        spotLight.position.set(...(config.position ?? [5, 8, 5]));
        if (config.castShadow ?? true) {
          spotLight.castShadow = true;
          spotLight.shadow.mapSize.set(1024, 1024);
        }
        light = spotLight;
        break;
      }

      case 'hemisphere': {
        const hemiLight = new HemisphereLight(
          config.color ?? 0x87ceeb,       // Sky color
          config.groundColor ?? 0x362d1b, // Ground color
          config.intensity ?? 0.5
        );
        light = hemiLight;
        break;
      }

      default:
        throw new Error(`Unknown light type: ${config.type}`);
    }

    const id = this.sceneManager.addObject(light, 'light', this.getLightLabel(config.type));

    // Create visual helper
    this.createHelper(id, light, config.type);

    return id;
  }

  removeLight(id: string): void {
    this.removeHelper(id);
    this.sceneManager.removeObject(id);
  }

  // --- Helpers (visual indicators for lights) ---

  private createHelper(id: string, light: Light, type: LightType): void {
    let helper: Object3D | null = null;

    switch (type) {
      case 'directional':
        helper = new DirectionalLightHelper(light as DirectionalLight, 1, 0xffdd44);
        break;
      case 'point':
        helper = new PointLightHelper(light as PointLight, 0.5, 0xffdd44);
        break;
      case 'spot':
        helper = new SpotLightHelper(light as SpotLight, 0xffdd44);
        break;
      // Ambient and hemisphere don't need visual helpers
    }

    if (helper) {
      helper.visible = this.showHelpers;
      helper.name = `_PerspX_light_helper_${id}`;
      this.sceneManager.scene.add(helper);
      this.helpers.set(id, helper);
    }
  }

  private removeHelper(id: string): void {
    const helper = this.helpers.get(id);
    if (helper) {
      this.sceneManager.scene.remove(helper);
      this.helpers.delete(id);
    }
  }

  toggleHelpers(): boolean {
    this.showHelpers = !this.showHelpers;
    for (const helper of this.helpers.values()) {
      helper.visible = this.showHelpers;
    }
    return this.showHelpers;
  }

  updateHelpers(): void {
    for (const helper of this.helpers.values()) {
      if ('update' in helper && typeof (helper as any).update === 'function') {
        (helper as any).update();
      }
    }
  }

  private getLightLabel(type: LightType): string {
    const labels: Record<LightType, string> = {
      ambient: 'Ambient Light',
      directional: 'Directional Light',
      point: 'Point Light',
      spot: 'Spot Light',
      hemisphere: 'Hemisphere Light',
    };
    return labels[type];
  }

  // --- Light Property Updates ---

  updateLightColor(id: string, color: number): void {
    const light = this.sceneManager.getObject(id) as Light | undefined;
    if (light) light.color.set(color);
  }

  updateLightIntensity(id: string, intensity: number): void {
    const light = this.sceneManager.getObject(id) as Light | undefined;
    if (light) light.intensity = intensity;
  }
}
```

### `src/lighting/light-presets.ts`

```ts
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
};
```

---

## Integration

```ts
import { LightManager } from '@/lighting/light-manager';
import { LIGHTING_PRESETS } from '@/lighting/light-presets';

const lightManager = new LightManager(sceneManager);

// Apply a preset
function applyLightingPreset(presetName: string): void {
  // Remove existing lights
  const existingLights = sceneManager.getObjectsByType('light');
  for (const { id } of existingLights) {
    lightManager.removeLight(id);
  }

  // Add preset lights
  const preset = LIGHTING_PRESETS[presetName];
  if (!preset) return;
  for (const config of preset.lights) {
    lightManager.addLight(config);
  }
}

// Initialize with studio lighting
applyLightingPreset('studio');

// In render loop — update helpers
loop.onUpdate(() => {
  lightManager.updateHelpers();
});
```

---

## Verification

- Studio preset shows clean 3-point lighting with shadows
- Light helpers (arrows, spheres) appear at light positions
- Toggling helpers hides/shows visual indicators
- Changing light color/intensity updates in real-time
- Shadow maps render correctly without artifacts
- Switching presets removes old lights and adds new ones

---

## Output

After this phase, you have:
- [x] 5 light types (ambient, directional, point, spot, hemisphere)
- [x] Visual light helpers with toggle
- [x] 5 lighting presets (studio, outdoor, dramatic, flat, warm)
- [x] Real-time light property editing (color, intensity)
- [x] Shadow mapping with configurable resolution
- [x] Full integration with SceneManager

---

## Next → [09-shader-system.md](./09-shader-system.md)
