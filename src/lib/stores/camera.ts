import { writable } from 'svelte/store';
import type { CameraMode } from '../camera/camera-controller';

export interface CameraState {
  mode: CameraMode;
  fov: number;
  roll: number;
  zolly: boolean;
  fisheye: boolean;
  fisheyeIntensity: number;
  lockPan: boolean;
  lockOrbit: boolean;
}

export const cameraStore = writable<CameraState>({
  mode: 'perspective',
  fov: 50,
  roll: 0,
  zolly: false,
  fisheye: false,
  fisheyeIntensity: 0,
  lockPan: false,
  lockOrbit: false
});

export function updateCameraStore(updates: Partial<CameraState>) {
  cameraStore.update(state => ({ ...state, ...updates }));
}
