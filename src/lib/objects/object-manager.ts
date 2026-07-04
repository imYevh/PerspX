import type { SceneManager } from '$lib/core/scene';
import { createPrimitive, PRIMITIVES, type PrimitiveType } from './primitives';

export class ObjectManager {
  constructor(private sceneManager: SceneManager) {}

  addPrimitive(type: PrimitiveType, explicitId?: string, explicitMeta?: any): string {
    const mesh = createPrimitive(type);
    mesh.userData.itemType = type;

    // Offset position so objects don't stack on top of each other, unless restoring
    if (!explicitId) {
      const count = this.sceneManager.getObjectsByType('primitive').length;
      mesh.position.x = (count % 5) * 2 - 4;
      mesh.position.z = Math.floor(count / 5) * 2 - 4;
    }

    return this.sceneManager.addObject(mesh, 'primitive', PRIMITIVES[type].label, explicitId, explicitMeta);
  }

  removeObject(id: string): void {
    this.sceneManager.removeObject(id);
  }
}
