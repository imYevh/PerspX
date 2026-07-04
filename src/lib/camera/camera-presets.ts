import { Vector3 } from 'three';

export interface CameraPreset {
  name: string;
  position: Vector3;
  target: Vector3;
  fov: number;
}

export const CAMERA_PRESETS: Record<string, CameraPreset> = {
  // Standard views
  front: {
    name: 'Front',
    position: new Vector3(0, 0, 10),
    target: new Vector3(0, 0, 0),
    fov: 50,
  },
  back: {
    name: 'Back',
    position: new Vector3(0, 0, -10),
    target: new Vector3(0, 0, 0),
    fov: 50,
  },
  left: {
    name: 'Left',
    position: new Vector3(-10, 0, 0),
    target: new Vector3(0, 0, 0),
    fov: 50,
  },
  right: {
    name: 'Right',
    position: new Vector3(10, 0, 0),
    target: new Vector3(0, 0, 0),
    fov: 50,
  },
  top: {
    name: 'Top',
    position: new Vector3(0, 10, 0),
    target: new Vector3(0, 0, 0),
    fov: 50,
  },
  bottom: {
    name: 'Bottom',
    position: new Vector3(0, -10, 0),
    target: new Vector3(0, 0, 0),
    fov: 50,
  },

  // Artistic perspectives
  dramatic: {
    name: 'Dramatic Low',
    position: new Vector3(3, 0.5, 3),
    target: new Vector3(0, 1, 0),
    fov: 85,
  },
  wideAngle: {
    name: 'Wide Angle',
    position: new Vector3(2, 1, 2),
    target: new Vector3(0, 0, 0),
    fov: 120,
  },
  telephoto: {
    name: 'Telephoto',
    position: new Vector3(30, 5, 30),
    target: new Vector3(0, 0, 0),
    fov: 12,
  },
  birdEye: {
    name: "Bird's Eye",
    position: new Vector3(5, 15, 5),
    target: new Vector3(0, 0, 0),
    fov: 40,
  }
};

// Focal length presets (35mm equivalent)
export const FOCAL_LENGTHS: Record<string, number> = {
  'Fish Eye (8mm)': 8,
  'Ultra Wide (14mm)': 14,
  'Wide (24mm)': 24,
  'Standard (35mm)': 35,
  'Normal (50mm)': 50,
  'Portrait (85mm)': 85,
  'Telephoto (135mm)': 135,
  'Super Telephoto (200mm)': 200,
};

/**
 * Convert focal length (mm) to vertical FOV (degrees).
 * Assumes 36mm sensor width (full frame).
 */
export function focalLengthToFOV(focalLength: number): number {
  return 2 * Math.atan(36 / (2 * focalLength)) * (180 / Math.PI);
}

/**
 * Convert vertical FOV (degrees) to focal length (mm).
 */
export function fovToFocalLength(fov: number): number {
  return 36 / (2 * Math.tan((fov * Math.PI) / 360));
}
