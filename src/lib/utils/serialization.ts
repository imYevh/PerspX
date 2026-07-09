import type { SceneManager, SceneObjectMeta } from '$lib/core/scene';
import type { ObjectManager } from '$lib/objects/object-manager';
import type { LightManager } from '$lib/lighting/light-manager';
import type { CameraState } from '$lib/stores/camera';
import { Vector3 } from 'three';

export interface SnapshotObject {
  meta: SceneObjectMeta;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  itemType?: string;
  intensity?: number;
  color?: string;
  /** For models: the original filename at time of import (not re-loadable from JSON). */
  originalFileName?: string;
}

export interface SceneSnapshot {
  objects: SnapshotObject[];
  selectedIds: string[];
  camera?: CameraState;
  cameraPosition?: [number, number, number];
  cameraTarget?: [number, number, number];
}

export function serializeScene(sceneManager: SceneManager, cameraState?: CameraState, cameraController?: any): SceneSnapshot {
  const objects = sceneManager.getAllObjects().map(({ object, meta }) => ({
    meta,
    position: [object.position.x, object.position.y, object.position.z] as [number, number, number],
    rotation: [object.rotation.x, object.rotation.y, object.rotation.z] as [number, number, number],
    scale: [object.scale.x, object.scale.y, object.scale.z] as [number, number, number],
    itemType: object.userData.itemType,
    intensity: 'intensity' in object ? (object as any).intensity : undefined,
    color: 'color' in object ? (object as any).color.getHexString() : undefined,
    // Models store their original filename so users know which file to re-import
    originalFileName: meta.type === 'model' ? (object.userData.originalFileName as string | undefined) : undefined,
  }));
  
  let cameraPosition: [number, number, number] | undefined;
  let cameraTarget: [number, number, number] | undefined;
  
  if (cameraController && cameraController.perspCamera && cameraController.target) {
     cameraPosition = [cameraController.perspCamera.position.x, cameraController.perspCamera.position.y, cameraController.perspCamera.position.z];
     cameraTarget = [cameraController.target.x, cameraController.target.y, cameraController.target.z];
  }
  
  return { 
    objects,
    selectedIds: sceneManager.getSelectedIds(),
    camera: cameraState,
    cameraPosition,
    cameraTarget
  };
}

/**
 * Apply a scene snapshot. Returns an array of skipped model filenames
 * (models cannot be restored from JSON — the user must re-import them).
 */
export function applySceneSnapshot(
  snapshot: SceneSnapshot,
  sceneManager: SceneManager,
  objectManager: ObjectManager,
  lightManager: LightManager,
  updateCameraStore?: (updates: Partial<CameraState>) => void,
  cameraController?: any
): string[] {
  sceneManager.clearAll();

  const skippedModels: string[] = [];

  for (const snapObj of snapshot.objects) {
    let id: string | null = null;

    if (snapObj.meta.type === 'model') {
      // Models cannot be restored from JSON — geometry is not embedded.
      const label = snapObj.originalFileName ?? snapObj.meta.name;
      skippedModels.push(label);
      console.warn(`[PerspX] Skipping model "${label}" — re-import the file to restore it.`);
      continue;
    } else if (snapObj.meta.type === 'primitive' && snapObj.itemType) {
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
        if ('color' in obj && snapObj.color !== undefined) {
          (obj as any).color.setHex(parseInt(snapObj.color, 16));
        }
        obj.updateMatrixWorld();
      }
    }
  }

  // Restore selection (filter out any model IDs that were skipped)
  if (snapshot.selectedIds.length > 0) {
    sceneManager.selectMultiple(snapshot.selectedIds, false);
  }

  // Restore camera state
  if (snapshot.camera && updateCameraStore) {
    updateCameraStore(snapshot.camera);
  }

  // Restore camera position
  if (snapshot.cameraPosition && snapshot.cameraTarget && cameraController) {
    const pos = new Vector3().fromArray(snapshot.cameraPosition);
    const target = new Vector3().fromArray(snapshot.cameraTarget);
    cameraController.applyState(pos, target);
    cameraController.update();
  }

  return skippedModels;
}

export function serializeObjects(sceneManager: SceneManager, ids: string[]): SnapshotObject[] {
  const objects: SnapshotObject[] = [];
  for (const id of ids) {
    const obj = sceneManager.getObject(id);
    const meta = sceneManager.getMeta(id);
    if (!obj || !meta) continue;

    objects.push({
      meta,
      position: [obj.position.x, obj.position.y, obj.position.z],
      rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
      scale: [obj.scale.x, obj.scale.y, obj.scale.z],
      itemType: obj.userData.itemType,
      intensity: 'intensity' in obj ? (obj as any).intensity : undefined,
      color: 'color' in obj ? (obj as any).color.getHexString() : undefined,
    });
  }
  return objects;
}

export function pasteObjects(
  objects: SnapshotObject[],
  sceneManager: SceneManager,
  objectManager: ObjectManager,
  lightManager: LightManager
): string[] {
  const newIds: string[] = [];

  for (const snapObj of objects) {
    let id: string | null = null;
    
    // We create a fresh meta without the old ID to let the managers assign a new UUID.
    // We also append "(Copy)" to the name.
    const { id: _discarded, ...newMeta } = snapObj.meta as any;
    newMeta.name = `${newMeta.name} (Copy)`;

    if (newMeta.type === 'primitive' && snapObj.itemType) {
      id = objectManager.addPrimitive(snapObj.itemType as any, undefined, newMeta);
    } else if (newMeta.type === 'light' && snapObj.itemType) {
      id = lightManager.addLight({
        type: snapObj.itemType as any,
        intensity: snapObj.intensity ?? 1,
        color: snapObj.color ? parseInt(snapObj.color, 16) : 0xffffff,
        explicitMeta: newMeta
      });
    }

    if (id) {
      newIds.push(id);
      const obj = sceneManager.getObject(id);
      if (obj) {
        // Offset slightly to make the paste obvious
        obj.position.fromArray(snapObj.position);
        obj.position.x += 0.5;
        obj.position.z += 0.5;
        
        obj.rotation.fromArray(snapObj.rotation);
        obj.scale.fromArray(snapObj.scale);
        
        if ('color' in obj && snapObj.color !== undefined) {
          (obj as any).color.setHex(parseInt(snapObj.color, 16));
        }
        obj.updateMatrixWorld();
      }
    }
  }

  return newIds;
}
