import type { SceneManager } from '$lib/core/scene';
import { createPrimitive, PRIMITIVES, type PrimitiveType } from './primitives';
import { loadModelFromFile, type ModelLoadResult } from './model-loader';

export class ObjectManager {
  constructor(private sceneManager: SceneManager) {}

  addPrimitive(type: PrimitiveType, explicitId?: string, explicitMeta?: any): string {
    const mesh = createPrimitive(type);
    mesh.userData.itemType = type;

    // Spawn 0.5 higher so object sits on grid
    mesh.position.y = 0.5;

    return this.sceneManager.addObject(mesh, 'primitive', PRIMITIVES[type].label, explicitId, explicitMeta);
  }

  /**
   * Import a 3D model file (.glb, .gltf, .obj, .fbx) into the scene.
   *
   * Returns `{ id, hasPerformanceWarning }` on success, or
   * `{ error, message }` on failure. Never throws.
   */
  async addModel(file: File): Promise<
    | { ok: true; id: string; hasPerformanceWarning: boolean }
    | { ok: false; error: string; message: string }
  > {
    const result: ModelLoadResult = await loadModelFromFile(file);

    if (!result.ok) {
      return result;
    }

    const { group, name, hasPerformanceWarning } = result;

    // Store original filename so serialization can reference it
    group.userData.itemType = 'model';
    group.userData.originalFileName = file.name;

    // Spawn 0.5 higher so model sits on grid
    group.position.y = 0.5;

    const id = this.sceneManager.addObject(group, 'model', name);
    return { ok: true, id, hasPerformanceWarning };
  }

  removeObject(id: string): void {
    this.sceneManager.removeObject(id);
  }
}
