import { writable } from 'svelte/store';
import type { CameraMode } from '../camera/camera-controller';

export interface CameraState {
  mode: CameraMode;
  fov: number;
  roll: number;
  curve: number;
}

export const cameraStore = writable<CameraState>({
  mode: 'perspective',
  fov: 50,
  roll: 0,
  curve: 0
});

export function updateCameraStore(mode: CameraMode, fov: number, roll: number, curve: number = 0) {
  cameraStore.set({ mode, fov, roll, curve });
}
