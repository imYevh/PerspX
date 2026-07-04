import {
  BoxGeometry,
  SphereGeometry,
  CylinderGeometry,
  ConeGeometry,
  TorusGeometry,
  PlaneGeometry,
  CapsuleGeometry,
  TorusKnotGeometry,
  IcosahedronGeometry,
  DodecahedronGeometry,
  BufferGeometry,
  Mesh,
  Color,
} from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';

export type PrimitiveType =
  | 'cube'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'torus'
  | 'plane'
  | 'capsule'
  | 'torusKnot'
  | 'icosahedron'
  | 'dodecahedron';

export interface PrimitiveDefinition {
  type: PrimitiveType;
  label: string;
  icon: string;     // Emoji or icon identifier for UI
  createGeometry: (params?: Record<string, number>) => BufferGeometry;
  defaultParams: Record<string, number>;
}

// Default material color palette (visually distinct)
const PRIMITIVE_COLORS = [
  0x4a9eff, // Blue
  0xff6b6b, // Red
  0x51cf66, // Green
  0xffd43b, // Yellow
  0xcc5de8, // Purple
  0x20c997, // Teal
  0xff922b, // Orange
  0x748ffc, // Indigo
  0xf06595, // Pink
  0x868e96, // Gray
];

let colorIndex = 0;

function nextColor(): number {
  const color = PRIMITIVE_COLORS[colorIndex % PRIMITIVE_COLORS.length];
  colorIndex++;
  return color;
}

export const PRIMITIVES: Record<PrimitiveType, PrimitiveDefinition> = {
  cube: {
    type: 'cube',
    label: 'Cube',
    icon: '🟦',
    defaultParams: { width: 1, height: 1, depth: 1 },
    createGeometry: (p) =>
      new BoxGeometry(p?.width ?? 1, p?.height ?? 1, p?.depth ?? 1),
  },
  sphere: {
    type: 'sphere',
    label: 'Sphere',
    icon: '🔵',
    defaultParams: { radius: 0.5, widthSegments: 32, heightSegments: 16 },
    createGeometry: (p) =>
      new SphereGeometry(p?.radius ?? 0.5, p?.widthSegments ?? 32, p?.heightSegments ?? 16),
  },
  cylinder: {
    type: 'cylinder',
    label: 'Cylinder',
    icon: '🛢️',
    defaultParams: { radiusTop: 0.5, radiusBottom: 0.5, height: 1, segments: 32 },
    createGeometry: (p) =>
      new CylinderGeometry(p?.radiusTop ?? 0.5, p?.radiusBottom ?? 0.5, p?.height ?? 1, p?.segments ?? 32),
  },
  cone: {
    type: 'cone',
    label: 'Cone',
    icon: '🔺',
    defaultParams: { radius: 0.5, height: 1, segments: 32 },
    createGeometry: (p) =>
      new ConeGeometry(p?.radius ?? 0.5, p?.height ?? 1, p?.segments ?? 32),
  },
  torus: {
    type: 'torus',
    label: 'Torus',
    icon: '⭕',
    defaultParams: { radius: 0.5, tube: 0.2, radialSegments: 16, tubularSegments: 48 },
    createGeometry: (p) =>
      new TorusGeometry(p?.radius ?? 0.5, p?.tube ?? 0.2, p?.radialSegments ?? 16, p?.tubularSegments ?? 48),
  },
  plane: {
    type: 'plane',
    label: 'Plane',
    icon: '⬜',
    defaultParams: { width: 2, height: 2 },
    createGeometry: (p) =>
      new PlaneGeometry(p?.width ?? 2, p?.height ?? 2),
  },
  capsule: {
    type: 'capsule',
    label: 'Capsule',
    icon: '💊',
    defaultParams: { radius: 0.3, length: 1, capSegments: 10, radialSegments: 16 },
    createGeometry: (p) =>
      new CapsuleGeometry(p?.radius ?? 0.3, p?.length ?? 1, p?.capSegments ?? 10, p?.radialSegments ?? 16),
  },
  torusKnot: {
    type: 'torusKnot',
    label: 'Torus Knot',
    icon: '🔗',
    defaultParams: { radius: 0.5, tube: 0.15 },
    createGeometry: (p) =>
      new TorusKnotGeometry(p?.radius ?? 0.5, p?.tube ?? 0.15),
  },
  icosahedron: {
    type: 'icosahedron',
    label: 'Icosahedron',
    icon: '🔷',
    defaultParams: { radius: 0.5, detail: 0 },
    createGeometry: (p) =>
      new IcosahedronGeometry(p?.radius ?? 0.5, p?.detail ?? 0),
  },
  dodecahedron: {
    type: 'dodecahedron',
    label: 'Dodecahedron',
    icon: '💎',
    defaultParams: { radius: 0.5, detail: 0 },
    createGeometry: (p) =>
      new DodecahedronGeometry(p?.radius ?? 0.5, p?.detail ?? 0),
  },
};

/**
 * Create a mesh from a primitive definition
 */
export function createPrimitive(
  type: PrimitiveType,
  params?: Record<string, number>,
  color?: number
): Mesh {
  const def = PRIMITIVES[type];
  if (!def) throw new Error(`Unknown primitive type: ${type}`);

  const geometry = def.createGeometry(params);
  const material = new MeshStandardNodeMaterial({
    color: new Color(color ?? nextColor()),
    roughness: 0.4,
    metalness: 0.1,
  });

  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

/**
 * Get the list of all available primitives (for UI)
 */
export function getPrimitiveList(): Array<{ type: PrimitiveType; label: string; icon: string }> {
  return Object.values(PRIMITIVES).map((def) => ({
    type: def.type,
    label: def.label,
    icon: def.icon,
  }));
}

/**
 * Reset the color cycle
 */
export function resetColorCycle(): void {
  colorIndex = 0;
}
