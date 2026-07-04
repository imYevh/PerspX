import { writable } from 'svelte/store';
import type { CameraMode } from '../camera/camera-controller';

export interface CameraState {
  mode: CameraMode;
  fov: number;
  roll: number;
  dollyZoom: number;
}

export const cameraStore = writable<CameraState>({
  mode: 'perspective',
  fov: 50,
  roll: 0,
  dollyZoom: 50
});

export function updateCameraStore(mode: CameraMode, fov: number, roll: number, dollyZoom: number = 50) {
  cameraStore.set({ mode, fov, roll, dollyZoom });
}
