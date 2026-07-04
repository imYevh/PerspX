import { writable } from 'svelte/store';
import type { Object3D } from 'three';
import type { SceneObjectMeta, SceneManager } from '../core/scene';

export interface SceneState {
  objects: Array<{ id: string; object: Object3D; meta: SceneObjectMeta }>;
  selectedIds: string[];
}

export const sceneStore = writable<SceneState>({
  objects: [],
  selectedIds: []
});

export function bindSceneManager(manager: SceneManager) {
  // Set initial state
  sceneStore.set({
    objects: manager.getAllObjects(),
    selectedIds: manager.getSelectedIds()
  });

  // Update store on any scene changes
  const updateState = () => {
    sceneStore.set({
      objects: manager.getAllObjects(),
      selectedIds: manager.getSelectedIds()
    });
  };

  manager.on('object-added', updateState);
  manager.on('object-removed', updateState);
  manager.on('selection-changed', updateState);
  manager.on('object-updated', updateState);
}
