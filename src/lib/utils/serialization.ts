import type { SceneManager, SceneObjectMeta } from '$lib/core/scene';
import type { ObjectManager } from '$lib/objects/object-manager';
import type { LightManager } from '$lib/lighting/light-manager';

export interface SnapshotObject {
  meta: SceneObjectMeta;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  itemType?: string;
  intensity?: number;
  color?: string;
}

export interface SceneSnapshot {
  objects: SnapshotObject[];
  selectedIds: string[];
}

export function serializeScene(sceneManager: SceneManager): SceneSnapshot {
  const objects = sceneManager.getAllObjects().map(({ object, meta }) => ({
    meta,
    position: [object.position.x, object.position.y, object.position.z] as [number, number, number],
    rotation: [object.rotation.x, object.rotation.y, object.rotation.z] as [number, number, number],
    scale: [object.scale.x, object.scale.y, object.scale.z] as [number, number, number],
    itemType: object.userData.itemType,
    intensity: 'intensity' in object ? (object as any).intensity : undefined,
    color: 'color' in object ? (object as any).color.getHexString() : undefined,
  }));
  return { 
    objects,
    selectedIds: sceneManager.getSelectedIds()
  };
}

export function applySceneSnapshot(
  snapshot: SceneSnapshot,
  sceneManager: SceneManager,
  objectManager: ObjectManager,
  lightManager: LightManager
): void {
  sceneManager.clearAll();

  for (const snapObj of snapshot.objects) {
    let id: string | null = null;
    
    if (snapObj.meta.type === 'primitive' && snapObj.itemType) {
      id = objectManager.addPrimitive(snapObj.itemType as any, snapObj.meta.id, snapObj.meta);
    } else if (snapObj.meta.type === 'light' && snapObj.itemType) {
      id = lightManager.addLight({
        type: snapObj.itemType as any,
        intensity: snapObj.intensity ?? 1,
        color: snapObj.color ? parseInt(snapObj.color, 16) : 0xffffff,
        explicitId: snapObj.meta.id,
        explicitMeta: snapObj.meta
      });
    }

    if (id) {
      const obj = sceneManager.getObject(id);
      if (obj) {
        obj.position.fromArray(snapObj.position);
        obj.rotation.fromArray(snapObj.rotation);
        obj.scale.fromArray(snapObj.scale);
        obj.updateMatrixWorld();
      }
    }
  }

  // Restore selection
  if (snapshot.selectedIds.length > 0) {
    sceneManager.selectMultiple(snapshot.selectedIds, false);
  }
}
