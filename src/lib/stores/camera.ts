import { writable } from 'svelte/store';
import type { CameraMode } from '../camera/camera-controller';

export interface CameraState {
  mode: CameraMode;
  fov: number;
  roll: number;
  zolly: boolean;
}

export const cameraStore = writable<CameraState>({
  mode: 'perspective',
  fov: 50,
  roll: 0,
  zolly: false
});

export function updateCameraStore(mode: CameraMode, fov: number, roll: number, zolly: boolean) {
  cameraStore.set({ mode, fov, roll, zolly });
}
