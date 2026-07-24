import { writable, get } from 'svelte/store';
import { serializeScene, applySceneSnapshot, type SceneSnapshot } from '../utils/serialization';
import type { SceneManager } from '$lib/core/scene';
import type { ObjectManager } from '$lib/objects/object-manager';
import type { LightManager } from '$lib/lighting/light-manager';

export interface HistoryState {
  past: SceneSnapshot[];
  future: SceneSnapshot[];
}

export const historyStore = writable<HistoryState>({
  past: [],
  future: []
});

const MAX_HISTORY = 50;

let isRestoring = false;
export function isHistoryRestoring() {
  return isRestoring;
}
export function setHistoryRestoring(val: boolean) {
  isRestoring = val;
}

export function initHistory(sceneManager: SceneManager) {
  historyStore.set({
    past: [serializeScene(sceneManager)],
    future: []
  });
}

let commitQueued = false;
let queuedReplaceLast = false;

export function commitHistory(sceneManager: SceneManager, replaceLast = false) {
  if (isRestoring) return;
  
  if (replaceLast) queuedReplaceLast = true;
  
  if (commitQueued) return;
  commitQueued = true;
  
  queueMicrotask(() => {
    commitQueued = false;
    if (isRestoring) return;
    
    const snapshot = serializeScene(sceneManager);
    const shouldReplace = queuedReplaceLast;
    queuedReplaceLast = false;
    
    historyStore.update(s => {
      if (shouldReplace && s.past.length > 1) {
        return {
          past: [...s.past.slice(0, -1), snapshot],
          future: []
        };
      }
      return {
        past: [...s.past, snapshot].slice(-MAX_HISTORY),
        future: []
      };
    });
  });
}

export function undo(sceneManager: SceneManager, objectManager: ObjectManager, lightManager: LightManager): boolean {
  const state = get(historyStore);
  if (state.past.length <= 1) return false; // Need at least the initial state

  const currentSnapshot = state.past[state.past.length - 1];
  const previousSnapshot = state.past[state.past.length - 2];

  historyStore.update(s => ({
    past: s.past.slice(0, -1),
    future: [currentSnapshot, ...s.future]
  }));

  isRestoring = true;
  try {
    applySceneSnapshot(previousSnapshot, sceneManager, objectManager, lightManager);
    return true;
  } finally {
    isRestoring = false;
  }
}

export function redo(sceneManager: SceneManager, objectManager: ObjectManager, lightManager: LightManager): boolean {
  const state = get(historyStore);
  if (state.future.length === 0) return false;

  const nextSnapshot = state.future[0];

  historyStore.update(s => ({
    past: [...s.past, nextSnapshot],
    future: s.future.slice(1)
  }));

  isRestoring = true;
  try {
    applySceneSnapshot(nextSnapshot, sceneManager, objectManager, lightManager);
    return true;
  } finally {
    isRestoring = false;
  }
}
