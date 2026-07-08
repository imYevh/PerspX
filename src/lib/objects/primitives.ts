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
  DoubleSide,
  EdgesGeometry,
  LineBasicMaterial,
  MeshBasicMaterial,
  CircleGeometry,
  Group,
  Box3,
  LineSegments,
  Object3D
} from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { 
  generateIntersectionLines, 
  assignXYZColors, 
  getHalfPlanes, 
  getThirdPlanes, 
  getCrossPlanes 
} from './overlay-utils';

export type PrimitiveType =
  | 'cube'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'torus'
  | 'plane'
  | 'capsule';

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
};

/**
 * Create a mesh from a primitive definition
 */
export function createPrimitive(
  type: PrimitiveType,
  params?: Record<string, number>,
  color?: number
): Group {
  const def = PRIMITIVES[type];
  if (!def) throw new Error(`Unknown primitive type: ${type}`);

  const group = new Group();
  const geometry = def.createGeometry(params);
  
  // Base Mesh
  const baseColor = color ?? 0xffffff;
  const material = new MeshStandardNodeMaterial({
    color: new Color(baseColor),
    roughness: 0.4,
    metalness: 0.1,
    side: DoubleSide,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  });

  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.isBaseMesh = true;
  mesh.userData.baseColor = baseColor;
  group.add(mesh);

  // Compute bounding box for plane generation
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;

  // 1. Default Edges
  let defaultEdges: Object3D;
  if (type === 'sphere') {
    defaultEdges = new Group();
    const radius = params?.radius ?? 0.5;
    const dotGeo = new CircleGeometry(radius * 0.04, 16);
    const dotMat = new MeshBasicMaterial({ color: 0x000000, side: DoubleSide });
    
    const topDot = new Mesh(dotGeo, dotMat);
    topDot.position.y = radius;
    topDot.rotation.x = -Math.PI / 2;
    
    const bottomDot = new Mesh(dotGeo, dotMat);
    bottomDot.position.y = -radius;
    bottomDot.rotation.x = Math.PI / 2;
    
    defaultEdges.add(topDot, bottomDot);
  } else {
    const edgesGeo = new EdgesGeometry(geometry);
    defaultEdges = new LineSegments(edgesGeo, new LineBasicMaterial({ color: 0xffffff }));
  }
  defaultEdges.userData.isDefaultEdges = true;
  group.add(defaultEdges);

  // 2. XYZ Edges
  let xyzEdges: Object3D;
  if (type === 'sphere') {
    const xyzPlanes = getHalfPlanes(bbox);
    const xyzGeo = generateIntersectionLines(geometry, xyzPlanes);
    assignXYZColors(xyzGeo);
    xyzEdges = new LineSegments(xyzGeo, new LineBasicMaterial({ vertexColors: true }));
  } else {
    // Other primitives use colored default edges for XYZ
    const edgesGeo = new EdgesGeometry(geometry);
    assignXYZColors(edgesGeo);
    xyzEdges = new LineSegments(edgesGeo, new LineBasicMaterial({ vertexColors: true }));
  }
  xyzEdges.userData.isXYZEdges = true;
  xyzEdges.visible = false;
  group.add(xyzEdges);

  // 3. Halfs
  const halfPlanes = getHalfPlanes(bbox);
  const halfGeo = generateIntersectionLines(geometry, halfPlanes);
  const halfLines = new LineSegments(halfGeo, new LineBasicMaterial({ color: 0x4a9eff })); // Blue
  halfLines.userData.isHalfLines = true;
  halfLines.visible = false;
  group.add(halfLines);

  // 4. Thirds
  let thirdPlanes = getThirdPlanes(bbox);
  if (type === 'sphere') {
    thirdPlanes = thirdPlanes.filter(p => Math.abs(p.normal.y) > 0.5);
  }
  const thirdGeo = generateIntersectionLines(geometry, thirdPlanes);
  const thirdLines = new LineSegments(thirdGeo, new LineBasicMaterial({ color: 0xff6b6b })); // Red
  thirdLines.userData.isThirdLines = true;
  thirdLines.visible = false;
  group.add(thirdLines);

  // 5. Cross
  const crossPlanes = getCrossPlanes(bbox);
  const crossGeo = generateIntersectionLines(geometry, crossPlanes);
  const crossLines = new LineSegments(crossGeo, new LineBasicMaterial({ color: 0x51cf66 })); // Green
  crossLines.userData.isCrossLines = true;
  crossLines.visible = false;
  group.add(crossLines);

  return group;
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
