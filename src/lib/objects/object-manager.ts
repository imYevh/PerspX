import type { SceneManager } from '$lib/core/scene';
import { createPrimitive, PRIMITIVES, type PrimitiveType } from './primitives';

export class ObjectManager {
  constructor(private sceneManager: SceneManager) {}

  addPrimitive(type: PrimitiveType): string {
    const mesh = createPrimitive(type);

    // Offset position so objects don't stack on top of each other
    const count = this.sceneManager.getObjectsByType('primitive').length;
    mesh.position.x = (count % 5) * 2 - 4;
    mesh.position.z = Math.floor(count / 5) * 2 - 4;

    return this.sceneManager.addObject(mesh, 'primitive', PRIMITIVES[type].label);
  }

  removeObject(id: string): void {
    this.sceneManager.removeObject(id);
  }
}
