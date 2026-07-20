import { Scene, Object3D, Raycaster, Vector2, Camera, BoxHelper } from "three";
import { generateId } from "$lib/utils/math";

export type ObjectType = "primitive" | "model" | "light" | "helper" | "group";

export interface SceneObjectMeta {
  id: string;
  name: string;
  type: ObjectType;
  locked: boolean;
  visible: boolean;
  createdAt: number;
}

export type SceneEventType =
  | "object-added"
  | "object-removed"
  | "selection-changed"
  | "object-updated";

export type SceneEventCallback = (data: any) => void;

export class SceneManager {
  public readonly scene: Scene;
  private objects: Map<string, Object3D> = new Map();
  private metadata: Map<string, SceneObjectMeta> = new Map();
  private selectedIds: Set<string> = new Set();
  private selectionBoxes: Map<string, BoxHelper> = new Map();
  private listeners: Map<SceneEventType, SceneEventCallback[]> = new Map();
  private raycaster = new Raycaster();

  constructor(scene: Scene) {
    this.scene = scene;
    if (this.raycaster.params.Line) {
      this.raycaster.params.Line.threshold = 0.05; // Make line selection much more precise
  }

  public updateSelectionBoxes() {
    // Remove old boxes
    for (const [id, box] of this.selectionBoxes) {
      if (!this.selectedIds.has(id)) {
        this.scene.remove(box);
        box.dispose();
        this.selectionBoxes.delete(id);
      }
    }
    // Add new boxes
    for (const id of this.selectedIds) {
      if (!this.selectionBoxes.has(id)) {
        const obj = this.objects.get(id);
        if (obj) {
          const box = new BoxHelper(obj, 0x4a9eff);
          box.userData.isSelectionBox = true;
          this.scene.add(box);
          this.selectionBoxes.set(id, box);
        }
      } else {
        this.selectionBoxes.get(id)?.update();
      }
    }
  }

  // --- Object Lifecycle ---

  addObject(object: Object3D, type: ObjectType, baseName?: string, explicitId?: string, explicitMeta?: SceneObjectMeta): string {
    const id = explicitId || generateId();
    const name = baseName ? this.generateUniqueName(baseName) : "Object";

    object.userData.PerspXId = id;

    const meta: SceneObjectMeta = explicitMeta || {
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

    this.emit("object-added", { id, object, meta });
    return id;
  }

  removeObject(id: string): void {
    const object = this.objects.get(id);
    if (!object) return;

    this.scene.remove(object);
    this.objects.delete(id);
    this.metadata.delete(id);

    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
      this.updateSelectionBoxes();
    }
    // Deep dispose: traverse all descendants and clean up geometry + materials.
    // This is essential for 3D models (Groups with many child Meshes/LineSegments).
    object.traverse((child: any) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        const mat = child.material;
        if (Array.isArray(mat)) mat.forEach((m: any) => m.dispose());
        else mat.dispose();
      }
    });

    this.emit("object-removed", { id });
    if (wasSelected) {
      this.emit("selection-changed", { selectedIds: [...this.selectedIds] });
    }
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

  getAllObjects(): Array<{
    id: string;
    object: Object3D;
    meta: SceneObjectMeta;
  }> {
    const result: Array<{
      id: string;
      object: Object3D;
      meta: SceneObjectMeta;
    }> = [];
    for (const [id, object] of this.objects) {
      const meta = this.metadata.get(id)!;
      result.push({ id, object, meta });
    }
    return result;
  }

  getObjectsByType(
    type: ObjectType,
  ): Array<{ id: string; object: Object3D; meta: SceneObjectMeta }> {
    return this.getAllObjects().filter((entry) => entry.meta.type === type);
  }

  // --- Selection ---

  select(id: string, additive = false): void {
    if (!additive) this.selectedIds.clear();
    this.selectedIds.add(id);
    this.updateSelectionBoxes();
    this.emit("selection-changed", { selectedIds: [...this.selectedIds] });
  }

  selectMultiple(ids: string[], additive = false): void {
    if (!additive) this.selectedIds.clear();
    for (const id of ids) {
      this.selectedIds.add(id);
    }
    this.updateSelectionBoxes();
    this.emit("selection-changed", { selectedIds: [...this.selectedIds] });
  }

  deselect(id: string): void {
    this.selectedIds.delete(id);
    this.updateSelectionBoxes();
    this.emit("selection-changed", { selectedIds: [...this.selectedIds] });
  }

  deselectAll(): void {
    this.selectedIds.clear();
    this.updateSelectionBoxes();
    this.emit("selection-changed", { selectedIds: [] });
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
    camera: Camera,
  ): { id: string; object: Object3D } | null {
    this.raycaster.setFromCamera(screenPos, camera);

    const targetObjects: Object3D[] = [];
    this.scene.traverse((child) => {
      if (child.name === '_PerspX_grid' || child.name === '_PerspX_ground') return;
      if (child.userData.PerspXId) {
        targetObjects.push(child);
      }
    });

    const intersects = this.raycaster.intersectObjects(targetObjects, true);
    if (intersects.length === 0) return null;

    // Walk up to find the registered parent
    let hit = intersects[0].object;
    while (hit && !hit.userData.PerspXId) {
      hit = hit.parent as Object3D;
    }

    if (!hit?.userData.PerspXId) return null;
    
    // Return the actual object from the registry (so selecting a helper returns the light)
    return { id: hit.userData.PerspXId, object: this.objects.get(hit.userData.PerspXId)! };
  }

  // --- Naming ---

  private generateUniqueName(baseName: string): string {
    // We walk the entire metadata map every time. This is O(n),
    // but for typical scene sizes (<1000 objects) this is fine.
    // It gracefully handles renumbering if earlier copies are deleted.
    let suffix = 1;
    let name = `${baseName} ${suffix}`;
    const existingNames = new Set(Array.from(this.metadata.values()).map(m => m.name));
    
    while (existingNames.has(name)) {
      suffix++;
      name = `${baseName} ${suffix}`;
    }
    return name;
  }

  renameObject(id: string, newName: string): void {
    const meta = this.metadata.get(id);
    if (!meta) return;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === meta.name) return;
    meta.name = trimmed;
    this.emit('object-updated', { id, meta });
  }

  duplicateObject(id: string): string | null {
    const original = this.objects.get(id);
    const meta = this.metadata.get(id);
    if (!original || !meta) return null;

    const clone = original.clone();
    // Offset slightly so the duplicate is distinguishable in the viewport
    clone.position.x += 0.5;
    clone.position.z += 0.5;

    // Strip the old PerspXId so addObject generates a fresh one
    clone.traverse((child) => { delete child.userData.PerspXId; });

    // Generate a unique copy name: strip trailing " (Copy N)" first, then suffix
    const baseName = meta.name.replace(/ \(Copy(?: \d+)?\)$/, '');
    const copyBase = `${baseName} (Copy)`;
    const existingNames = new Set(Array.from(this.metadata.values()).map(m => m.name));
    let copyName = copyBase;
    let n = 1;
    while (existingNames.has(copyName)) {
      n++;
      copyName = `${baseName} (Copy ${n})`;
    }

    // Let addObject create a clean id + default meta, then patch the name
    const newId = this.addObject(clone, meta.type, baseName);
    const newMeta = this.metadata.get(newId);
    if (newMeta) {
      newMeta.name = copyName;
      newMeta.visible = meta.visible;
      // emit update so the store reflects the correct name
      this.emit('object-updated', { id: newId, meta: newMeta });
    }
    return newId;
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
