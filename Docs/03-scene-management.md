# 03 — Scene Management

## Goal
Build a scene management system that tracks all objects, supports selection, and provides a clean API for adding/removing/querying objects.

---

## Key Concepts

### Scene Graph
Three.js already provides a scene graph via `Object3D` parenting. Our `SceneManager` wraps this with:
- **Object registry**: Track all user-added objects with metadata (name, type, locked, visible)
- **Selection system**: Single and multi-select with visual highlighting
- **Event-driven updates**: UI panels subscribe to scene changes

### SceneObject Metadata
Each object in the scene has associated metadata stored separately (not on the Three.js object) to keep the engine layer clean:

```ts
interface SceneObjectMeta {
  id: string;             // Unique ID (UUID)
  name: string;           // Display name (e.g., "Cube 1")
  type: ObjectType;       // 'primitive' | 'model' | 'light' | 'helper'
  locked: boolean;        // Prevent accidental transforms
  visible: boolean;       // Toggle visibility
  createdAt: number;      // Timestamp
}
```

---

## Implementation

### `src/core/scene.ts`

```ts
import { Scene, Object3D, Raycaster, Vector2, Camera } from 'three';
import { generateId } from '@/utils/math';

export type ObjectType = 'primitive' | 'model' | 'light' | 'helper' | 'group';

export interface SceneObjectMeta {
  id: string;
  name: string;
  type: ObjectType;
  locked: boolean;
  visible: boolean;
  createdAt: number;
}

export type SceneEventType =
  | 'object-added'
  | 'object-removed'
  | 'selection-changed'
  | 'object-updated';

export type SceneEventCallback = (data: any) => void;

export class SceneManager {
  public readonly scene: Scene;
  private objects: Map<string, Object3D> = new Map();
  private metadata: Map<string, SceneObjectMeta> = new Map();
  private selectedIds: Set<string> = new Set();
  private listeners: Map<SceneEventType, SceneEventCallback[]> = new Map();
  private raycaster = new Raycaster();
  private nameCounters: Map<string, number> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  // --- Object Lifecycle ---

  addObject(object: Object3D, type: ObjectType, baseName?: string): string {
    const id = generateId();
    const name = this.generateUniqueName(baseName ?? 'Object');

    object.userData.PerspXId = id;

    const meta: SceneObjectMeta = {
      id,
      name,
      type,
      locked: false,
      visible: true,
      createdAt: Date.now(),
    };

    this.objects.set(id, object);
    this.metadata.set(id, meta);
    this.scene.add(object);

    this.emit('object-added', { id, object, meta });
    return id;
  }

  removeObject(id: string): void {
    const object = this.objects.get(id);
    if (!object) return;

    this.scene.remove(object);
    this.objects.delete(id);
    this.metadata.delete(id);
    this.selectedIds.delete(id);

    // Dispose geometry and materials
    if ('geometry' in object) (object as any).geometry?.dispose();
    if ('material' in object) {
      const mat = (object as any).material;
      if (Array.isArray(mat)) mat.forEach((m: any) => m.dispose());
      else mat?.dispose();
    }

    this.emit('object-removed', { id });
  }

  clearAll(): void {
    const ids = [...this.objects.keys()];
    for (const id of ids) this.removeObject(id);
  }

  // --- Query ---

  getObject(id: string): Object3D | undefined {
    return this.objects.get(id);
  }

  getMeta(id: string): SceneObjectMeta | undefined {
    return this.metadata.get(id);
  }

  getAllObjects(): Array<{ id: string; object: Object3D; meta: SceneObjectMeta }> {
    const result: Array<{ id: string; object: Object3D; meta: SceneObjectMeta }> = [];
    for (const [id, object] of this.objects) {
      const meta = this.metadata.get(id)!;
      result.push({ id, object, meta });
    }
    return result;
  }

  getObjectsByType(type: ObjectType): Array<{ id: string; object: Object3D; meta: SceneObjectMeta }> {
    return this.getAllObjects().filter((entry) => entry.meta.type === type);
  }

  // --- Selection ---

  select(id: string, additive = false): void {
    if (!additive) this.selectedIds.clear();
    this.selectedIds.add(id);
    this.emit('selection-changed', { selectedIds: [...this.selectedIds] });
  }

  deselect(id: string): void {
    this.selectedIds.delete(id);
    this.emit('selection-changed', { selectedIds: [...this.selectedIds] });
  }

  deselectAll(): void {
    this.selectedIds.clear();
    this.emit('selection-changed', { selectedIds: [] });
  }

  getSelectedIds(): string[] {
    return [...this.selectedIds];
  }

  getSelectedObjects(): Object3D[] {
    return this.getSelectedIds()
      .map((id) => this.objects.get(id))
      .filter(Boolean) as Object3D[];
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  // --- Raycasting (Click-to-Select) ---

  raycastFromScreen(
    screenPos: Vector2,
    camera: Camera
  ): { id: string; object: Object3D } | null {
    this.raycaster.setFromCamera(screenPos, camera);

    const meshes = this.getAllObjects()
      .filter((e) => e.meta.type === 'primitive' || e.meta.type === 'model')
      .map((e) => e.object);

    const intersects = this.raycaster.intersectObjects(meshes, true);
    if (intersects.length === 0) return null;

    // Walk up to find the registered parent
    let hit = intersects[0].object;
    while (hit && !hit.userData.PerspXId) {
      hit = hit.parent as Object3D;
    }

    if (!hit?.userData.PerspXId) return null;
    return { id: hit.userData.PerspXId, object: hit };
  }

  // --- Naming ---

  private generateUniqueName(baseName: string): string {
    const count = (this.nameCounters.get(baseName) ?? 0) + 1;
    this.nameCounters.set(baseName, count);
    return `${baseName} ${count}`;
  }

  // --- Events ---

  on(event: SceneEventType, callback: SceneEventCallback): void {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(callback);
  }

  off(event: SceneEventType, callback: SceneEventCallback): void {
    const cbs = this.listeners.get(event);
    if (!cbs) return;
    const idx = cbs.indexOf(callback);
    if (idx !== -1) cbs.splice(idx, 1);
  }

  private emit(event: SceneEventType, data: any): void {
    const cbs = this.listeners.get(event);
    if (cbs) cbs.forEach((cb) => cb(data));
  }
}
```

### `src/utils/math.ts` (partial)

```ts
let counter = 0;

export function generateId(): string {
  return `obj_${Date.now()}_${counter++}`;
}
```

---

## Integration with main.ts

Replace the test cube code with:

```ts
import { SceneManager } from '@/core/scene';
import { BoxGeometry, Mesh } from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';

// After renderer init...
const sceneManager = new SceneManager(renderer.scene);

// Add a cube via scene manager
const cube = new Mesh(
  new BoxGeometry(1, 1, 1),
  new MeshStandardNodeMaterial({ color: 0x4a9eff })
);
const cubeId = sceneManager.addObject(cube, 'primitive', 'Cube');

// Listen for changes
sceneManager.on('object-added', (data) => {
  console.log(`Added: ${data.meta.name} (${data.id})`);
});
```

---

## Verification

- Adding an object logs its name and ID to the console
- `sceneManager.getAllObjects()` returns the correct list
- `sceneManager.removeObject(cubeId)` removes the cube from the scene
- Selection events fire correctly

---

## Output

After this phase, you have:
- [x] Centralized object registry with metadata
- [x] Add/remove/query objects with unique IDs and auto-naming
- [x] Selection system (single + multi-select)
- [x] Raycasting for click-to-select
- [x] Event system for UI synchronization
- [x] Proper geometry/material disposal on removal

---

## Next → [04-camera-system.md](./04-camera-system.md)
