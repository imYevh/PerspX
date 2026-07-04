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
} from 'three';
import type { SceneManager } from '$lib/core/scene';

export type LightType = 'ambient' | 'directional' | 'point' | 'spot' | 'hemisphere';

export interface LightConfig {
  type: LightType;
  color?: number;
  intensity?: number;
  explicitId?: string;
  explicitMeta?: any;
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
    
    // Automatically clean up helpers when a light is removed (e.g. via delete key)
    this.sceneManager.on('object-removed', (data) => {
      this.removeHelper(data.id);
    });
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

    light.userData.itemType = config.type;

    const id = this.sceneManager.addObject(light, 'light', this.getLightLabel(config.type), config.explicitId, config.explicitMeta);

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
      helper.userData.PerspXId = id; // Attach ID so raycaster knows this is the light
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
