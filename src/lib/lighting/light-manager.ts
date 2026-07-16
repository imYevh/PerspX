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
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
  Mesh,
  MeshBasicMaterial,
  LineSegments,
  WireframeGeometry,
  Scene,
  SphereGeometry,
  EdgesGeometry
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
  shadowMapSize?: number;
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
  private helperScene?: Scene;

  setHelperScene(scene: Scene): void {
    this.helperScene = scene;
    for (const helper of this.helpers.values()) {
      this.sceneManager.scene.remove(helper);
      scene.add(helper);
    }
  }

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    
    // Automatically clean up helpers when a light is removed (e.g. via delete key)
    this.sceneManager.on('object-removed', (data) => {
      this.removeHelper(data.id);
    });
  }

  async applyPreset(presetName: string): Promise<void> {
    // Need to dynamically import to avoid circular dependency issues if any,
    // but better yet, we can just import it at the top. Let's assume we import LIGHTING_PRESETS.
    const { LIGHTING_PRESETS } = await import('./light-presets');
    const existingLights = this.sceneManager.getObjectsByType('light');
    for (const { id } of existingLights) {
       this.removeLight(id);
    }
    const preset = LIGHTING_PRESETS[presetName];
    if (!preset) return;
    for (const config of preset.lights) {
      this.addLight(config);
    }
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
          const shadowRes = config.shadowMapSize ?? 2048;
          const shadowBounds = shadowRes <= 512 ? 10 : 20;
          dirLight.castShadow = true;
          dirLight.shadow.mapSize.set(shadowRes, shadowRes);
          dirLight.shadow.bias = -0.0001;
          dirLight.shadow.normalBias = 0.02;
          dirLight.shadow.camera.near = 0.1;
          dirLight.shadow.camera.far = 100;
          dirLight.shadow.camera.left = -shadowBounds;
          dirLight.shadow.camera.right = shadowBounds;
          dirLight.shadow.camera.top = shadowBounds;
          dirLight.shadow.camera.bottom = -shadowBounds;
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
          pointLight.shadow.bias = -0.0001;
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
          spotLight.shadow.bias = -0.0001;
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
      case 'ambient':
      case 'hemisphere': {
        // No built-in Three.js helper — use a wireframe sphere so the light
        // is visible and selectable in the viewport.
        const geo = new SphereGeometry(0.25, 8, 6);
        const edges = new EdgesGeometry(geo);
        const mat = new LineBasicMaterial({ color: 0xffdd44 });
        const mesh = new LineSegments(edges, mat);
        geo.dispose();
        helper = mesh;
        break;
      }
    }

    if (helper) {
      helper.visible = this.showHelpers;
      helper.name = `_PerspX_light_helper_${id}`;
      helper.userData.PerspXId = id; // Attach ID so raycaster knows this is the light
      const targetScene = this.helperScene || this.sceneManager.scene;
      targetScene.add(helper);
      this.helpers.set(id, helper);
    }
  }

  private removeHelper(id: string): void {
    const helper = this.helpers.get(id);
    if (helper) {
      const targetScene = this.helperScene || this.sceneManager.scene;
      targetScene.remove(helper);
      this.helpers.delete(id);
    }
  }

  hideHelpers(): void {
    for (const helper of this.helpers.values()) {
      helper.visible = false;
    }
  }

  restoreHelpers(): void {
    for (const helper of this.helpers.values()) {
      helper.visible = this.showHelpers;
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
    for (const [id, helper] of this.helpers.entries()) {
      if ('update' in helper && typeof (helper as any).update === 'function') {
        (helper as any).update();
      }

      const light = this.sceneManager.getObject(id);
      if (light) {
        helper.traverse((child) => {
          if ((child as any).isLine && child.name !== 'dashedHelper') {
            const line = child as Line;
            if (!light.visible) {
              if (!(line.material instanceof LineDashedMaterial)) {
                const color = (line.material as LineBasicMaterial).color;
                line.material = new LineDashedMaterial({
                  color: color,
                  dashSize: 0.2,
                  gapSize: 0.2,
                  opacity: 0.4,
                  transparent: true
                });
                line.computeLineDistances();
              } else {
                // Keep color in sync
                (line.material as LineDashedMaterial).color.set((helper as any).color || (light as any).color);
              }
            } else {
              if (line.material instanceof LineDashedMaterial) {
                const color = line.material.color;
                line.material = new LineBasicMaterial({
                  color: color
                });
              }
            }
          }
          
          if ((child as any).isMesh) {
            const mesh = child as Mesh;
            if (mesh.material instanceof MeshBasicMaterial) {
              if (!light.visible) {
                let dashedLine = mesh.children.find(c => c.name === 'dashedHelper') as LineSegments;
                if (!dashedLine) {
                  const geometry = new WireframeGeometry(mesh.geometry);
                  const material = new LineDashedMaterial({
                    color: mesh.material.color.clone(),
                    dashSize: 0.2,
                    gapSize: 0.2,
                    opacity: 0.4,
                    transparent: true
                  });
                  dashedLine = new LineSegments(geometry, material);
                  dashedLine.name = 'dashedHelper';
                  dashedLine.computeLineDistances();
                  mesh.add(dashedLine);
                }
                // Sync color in case it changed
                (dashedLine.material as LineDashedMaterial).color.copy(mesh.material.color);
                
                mesh.material.visible = false;
                dashedLine.visible = true;
                dashedLine.updateMatrixWorld(true);
              } else {
                mesh.material.visible = true;
                const dashedLine = mesh.children.find(c => c.name === 'dashedHelper');
                if (dashedLine) dashedLine.visible = false;
              }
            }
          }
        });
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

  setSunElevation(elevationDegrees: number): void {
    const dirLights = this.sceneManager.getObjectsByType('light')
      .map(entry => entry.object)
      .filter(obj => obj.type === 'DirectionalLight');
    
    if (dirLights.length > 0) {
      // Rotate the first directional light around the scene center
      const light = dirLights[0];
      const radius = 20;
      const elevationRad = elevationDegrees * (Math.PI / 180);
      // Keep azimuth at 45 degrees (Math.PI / 4)
      light.position.setFromSphericalCoords(radius, Math.PI / 2 - elevationRad, Math.PI / 4);
      this.updateHelpers();
    }
  }
}
