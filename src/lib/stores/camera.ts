import { writable } from 'svelte/store';
import type { CameraMode } from '../camera/camera-controller';

export interface CameraState {
  mode: CameraMode;
  fov: number;
  roll: number;
  zolly: boolean;
  fisheye: boolean;
  fisheyeIntensity: number;
  chromaticAberration: boolean;
  chromaticAberrationIntensity: number;
  tiltShift: boolean;
  tiltShiftPosition: number;
  tiltShiftWidth: number;
  tiltShiftIntensity: number;
  guidelines: 'disabled' | 'full';
  lockPan: boolean;
  lockOrbit: boolean;
  orbitMode: 'free' | 'focus';
}

export const cameraStore = writable<CameraState>({
  mode: 'perspective',
  fov: 50,
  roll: 0,
  zolly: false,
  fisheye: true,
  fisheyeIntensity: 0,
  chromaticAberration: true,
  chromaticAberrationIntensity: 0,
  tiltShift: true,
  tiltShiftPosition: 0.5,
  tiltShiftWidth: 0.2,
  tiltShiftIntensity: 0,
  guidelines: 'disabled',
  lockPan: false,
  lockOrbit: false,
  orbitMode: 'free'
});

export function updateCameraStore(updates: Partial<CameraState>) {
  cameraStore.update(state => ({ ...state, ...updates }));
}
