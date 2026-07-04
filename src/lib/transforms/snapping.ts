import { MathUtils } from 'three';

export interface SnapConfig {
  translate: number; // World units
  rotate: number;    // Degrees
  scale: number;     // Scale factor
}

export const SNAP_PRESETS: Record<string, SnapConfig> = {
  none: { translate: 0, rotate: 0, scale: 0 },
  fine: { translate: 0.1, rotate: 5, scale: 0.05 },
  medium: { translate: 0.5, rotate: 15, scale: 0.1 },
  coarse: { translate: 1.0, rotate: 45, scale: 0.25 },
};

export function snapValue(value: number, snap: number): number {
  if (snap <= 0) return value;
  return Math.round(value / snap) * snap;
}

export function snapAngle(degrees: number, snap: number): number {
  if (snap <= 0) return degrees;
  return Math.round(degrees / snap) * snap;
}
