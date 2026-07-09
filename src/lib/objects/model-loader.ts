import {
  Group,
  BufferGeometry,
  Float32BufferAttribute,
  LineSegments,
  LineBasicMaterial,
  EdgesGeometry,
  Box3,
  Vector3,
  Object3D,
  Mesh,
  Color,
} from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import {
  generateIntersectionLines,
  assignXYZColors,
  getHalfPlanes,
  getThirdPlanes,
  getCrossPlanes,
} from './overlay-utils';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Maximum file size in bytes before we reject the file (100 MB). */
export const MODEL_MAX_FILE_SIZE = 100 * 1024 * 1024;

/** Maximum triangle count before we show a performance warning. */
export const MODEL_WARN_TRIANGLE_COUNT = 500_000;

/** Auto-scale: imported models are normalised to fit inside this bounding cube. */
const TARGET_SIZE = 2;

// ─── Types ───────────────────────────────────────────────────────────────────

export type ModelLoadError =
  | 'unsupported_format'
  | 'file_too_large'
  | 'parse_error'
  | 'empty_geometry';

export type ModelLoadResult =
  | {
      ok: true;
      /** The fully constructed Three.js Group, ready to add to the scene. */
      group: Group;
      /** Clean display name derived from the filename. */
      name: string;
      /** Total triangle count across all merged meshes. */
      triangleCount: number;
      /** True when triangleCount > MODEL_WARN_TRIANGLE_COUNT. */
      hasPerformanceWarning: boolean;
    }
  | {
      ok: false;
      error: ModelLoadError;
      message: string;
    };

// ─── Internal helpers ────────────────────────────────────────────────────────

/** Derive a human-readable name from a filename (strip extension, trim). */
function fileBaseName(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '').trim() || 'Model';
}

/**
 * Walk an Object3D tree and collect all Mesh geometries merged into one
 * BufferGeometry in world space. Returns null if no mesh data was found.
 */
function mergeGeometries(root: Object3D): BufferGeometry | null {
  const posArrays: Float32Array[] = [];
  let totalVerts = 0;

  // Make sure world matrices are computed from root downwards
  root.updateMatrixWorld(true);

  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const geo = child.geometry as BufferGeometry;
    const posAttr = geo.attributes.position;
    if (!posAttr) return;

    // Get or generate an indexed position array
    let positions: Float32Array;
    if (geo.index) {
      // Expand indexed geometry to non-indexed
      const idx = geo.index.array;
      positions = new Float32Array(idx.length * 3);
      for (let i = 0; i < idx.length; i++) {
        const vi = idx[i];
        positions[i * 3 + 0] = posAttr.getX(vi);
        positions[i * 3 + 1] = posAttr.getY(vi);
        positions[i * 3 + 2] = posAttr.getZ(vi);
      }
    } else {
      positions = new Float32Array(posAttr.array as ArrayBufferLike);
    }

    // Transform vertices to world space using child's world matrix
    const mat = child.matrixWorld;
    const v = new Vector3();
    for (let i = 0; i < positions.length; i += 3) {
      v.set(positions[i], positions[i + 1], positions[i + 2]);
      v.applyMatrix4(mat);
      positions[i] = v.x;
      positions[i + 1] = v.y;
      positions[i + 2] = v.z;
    }

    posArrays.push(positions);
    totalVerts += positions.length / 3;
  });

  if (posArrays.length === 0 || totalVerts === 0) return null;

  // Concatenate all position arrays into a single BufferGeometry
  const merged = new BufferGeometry();
  const allPositions = new Float32Array(totalVerts * 3);
  let offset = 0;
  for (const arr of posArrays) {
    allPositions.set(arr, offset);
    offset += arr.length;
  }
  merged.setAttribute('position', new Float32BufferAttribute(allPositions, 3));
  return merged;
}

/**
 * Centre and scale a root Object3D so that its bounding box fits within
 * TARGET_SIZE world units. Modifies root.position and root.scale.
 */
function normaliseRoot(root: Object3D): void {
  const box = new Box3().setFromObject(root);
  if (box.isEmpty()) return;

  const size = new Vector3();
  box.getSize(size);
  const centre = new Vector3();
  box.getCenter(centre);

  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim === 0) return;

  const scale = TARGET_SIZE / maxDim;
  root.scale.setScalar(scale);

  // After scaling, recompute the centre offset
  root.position.set(-centre.x * scale, -centre.y * scale, -centre.z * scale);
  // Lift to sit on ground (y = 0 floor)
  const newBox = new Box3().setFromObject(root);
  root.position.y -= newBox.min.y;
}

/**
 * Wrap the loaded root in a Group tagged as the base mesh.
 * Each child Mesh gets:
 *   - `userData.originalMaterial`  — the material as imported
 *   - `userData.primitiveMaterial` — semitransparent MeshStandardNodeMaterial
 * The display starts in 'primitive' mode so it visually matches primitives.
 */
function buildDisplayMesh(root: Object3D, primitiveColor: number): Group {
  const displayGroup = new Group();
  displayGroup.userData.isBaseMesh = true;
  displayGroup.userData.renderMode = 'primitive';
  displayGroup.add(root);

  // Walk every Mesh in the loaded hierarchy
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return;

    // Save the original imported material
    node.userData.originalMaterial = Array.isArray(node.material)
      ? node.material.slice()
      : node.material;

    // Build a primitive-style semitransparent material
    const primMat = new MeshStandardNodeMaterial({
      color: new Color(primitiveColor),
      roughness: 0.4,
      metalness: 0.1,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    node.userData.primitiveMaterial = primMat;

    // Start in primitive mode
    node.material = primMat;
  });

  return displayGroup;
}

// ─── Public helper ────────────────────────────────────────────────────────────

export type ModelRenderMode = 'primitive' | 'textured';

/**
 * Switch an imported model's display group between render modes.
 *
 * @param displayGroup  The child with `userData.isBaseMesh === true`
 * @param mode          'primitive' | 'textured'
 * @param solid         When true in primitive mode, uses opaque white fill (matches Solid overlay)
 */
export function applyRenderMode(
  displayGroup: Object3D,
  mode: ModelRenderMode,
  solid = false
): void {
  displayGroup.userData.renderMode = mode;

  displayGroup.traverse((node) => {
    if (!(node instanceof Mesh)) return;

    if (mode === 'textured') {
      // Restore original imported material
      if (node.userData.originalMaterial !== undefined) {
        node.material = node.userData.originalMaterial;
        // Make sure it renders normally
        if (!Array.isArray(node.material)) {
          node.material.transparent = false;
          node.material.opacity = 1.0;
          node.material.depthWrite = true;
          (node.material as any).needsUpdate = true;
        }
      }
    } else {
      // primitive mode
      const mat = node.userData.primitiveMaterial as MeshStandardNodeMaterial | undefined;
      if (mat) {
        if (solid) {
          mat.transparent = false;
          mat.opacity = 1.0;
          mat.depthWrite = true;
          mat.color.set(0xffffff);
        } else {
          mat.transparent = true;
          mat.opacity = 0.75;
          mat.depthWrite = false;
          // restore cycled color
          const col = node.userData.primitiveMaterialColor as number | undefined;
          mat.color.set(col ?? 0xffffff);
        }
        mat.needsUpdate = true;
        node.material = mat;
      }
    }
  });
}

/**
 * Build all PerspX overlay line objects (defaultEdges, xyzEdges, halfLines,
 * thirdLines, crossLines) from a merged non-indexed BufferGeometry.
 */
function buildOverlays(mergedGeo: BufferGeometry): {
  defaultEdges: Object3D;
  xyzEdges: Object3D;
  halfLines: Object3D;
  thirdLines: Object3D;
  crossLines: Object3D;
} {
  mergedGeo.computeBoundingBox();
  const bbox = mergedGeo.boundingBox!;

  // 1. Default edges — use EdgesGeometry on merged geo
  const edgesGeo = new EdgesGeometry(mergedGeo, 15); // 15° threshold keeps sharp edges
  const defaultEdges = new LineSegments(
    edgesGeo,
    new LineBasicMaterial({ color: 0xffffff })
  );
  defaultEdges.userData.isDefaultEdges = true;

  // 2. XYZ Edges
  const xyzPlanes = getHalfPlanes(bbox);
  const xyzGeo = generateIntersectionLines(mergedGeo, xyzPlanes);
  assignXYZColors(xyzGeo);
  const xyzEdges = new LineSegments(xyzGeo, new LineBasicMaterial({ vertexColors: true }));
  xyzEdges.userData.isXYZEdges = true;
  xyzEdges.visible = false;

  // 3. Half lines
  const halfPlanes = getHalfPlanes(bbox);
  const halfGeo = generateIntersectionLines(mergedGeo, halfPlanes);
  const halfLines = new LineSegments(halfGeo, new LineBasicMaterial({ color: 0x4a9eff }));
  halfLines.userData.isHalfLines = true;
  halfLines.visible = false;

  // 4. Third lines
  const thirdPlanes = getThirdPlanes(bbox);
  const thirdGeo = generateIntersectionLines(mergedGeo, thirdPlanes);
  const thirdLines = new LineSegments(thirdGeo, new LineBasicMaterial({ color: 0xff6b6b }));
  thirdLines.userData.isThirdLines = true;
  thirdLines.visible = false;

  // 5. Cross lines
  const crossPlanes = getCrossPlanes(bbox);
  const crossGeo = generateIntersectionLines(mergedGeo, crossPlanes);
  const crossLines = new LineSegments(crossGeo, new LineBasicMaterial({ color: 0x51cf66 }));
  crossLines.userData.isCrossLines = true;
  crossLines.visible = false;

  return { defaultEdges, xyzEdges, halfLines, thirdLines, crossLines };
}

// ─── Color cycling ────────────────────────────────────────────────────────────

const MODEL_COLORS = [
  0x4a9eff, 0xff6b6b, 0x51cf66, 0xffd43b,
  0xcc5de8, 0x20c997, 0xff922b, 0x748ffc,
];
let modelColorIndex = 0;
function nextModelColor(): number {
  const c = MODEL_COLORS[modelColorIndex % MODEL_COLORS.length];
  modelColorIndex++;
  return c;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Load a 3D model from a File object and return a fully assembled PerspX Group.
 *
 * The returned Group mirrors the structure of `createPrimitive()`:
 *   - child with `userData.isBaseMesh = true`  (solid mesh)
 *   - child with `userData.isDefaultEdges = true`
 *   - child with `userData.isXYZEdges = true`
 *   - child with `userData.isHalfLines = true`
 *   - child with `userData.isThirdLines = true`
 *   - child with `userData.isCrossLines = true`
 *
 * This function NEVER throws — all errors are returned as `{ ok: false }`.
 */
export async function loadModelFromFile(file: File): Promise<ModelLoadResult> {
  try {
    // ── Guard: file size ────────────────────────────────────────────────────
    if (file.size > MODEL_MAX_FILE_SIZE) {
      return {
        ok: false,
        error: 'file_too_large',
        message: `File is ${(file.size / 1024 / 1024).toFixed(1)} MB. Maximum allowed size is ${MODEL_MAX_FILE_SIZE / 1024 / 1024} MB.`,
      };
    }

    // ── Guard: format ───────────────────────────────────────────────────────
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const supported = ['glb', 'gltf', 'obj', 'fbx'];
    if (!supported.includes(ext)) {
      return {
        ok: false,
        error: 'unsupported_format',
        message: `Format ".${ext}" is not supported. Use: ${supported.map(f => '.' + f).join(', ')}.`,
      };
    }

    // ── Read file into ArrayBuffer or text ──────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();

    // ── Load with appropriate Three.js loader ──────────────────────────────
    let loadedRoot: Object3D;

    if (ext === 'glb' || ext === 'gltf') {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.parse(arrayBuffer, '', resolve, reject);
      });
      loadedRoot = gltf.scene as Object3D;

    } else if (ext === 'obj') {
      const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js');
      const loader = new OBJLoader();
      const text = new TextDecoder().decode(arrayBuffer);
      loadedRoot = loader.parse(text) as Object3D;

    } else if (ext === 'fbx') {
      const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
      const loader = new FBXLoader();
      loadedRoot = loader.parse(arrayBuffer, '') as Object3D;

    } else {
      // Should never reach here given the guard above
      return { ok: false, error: 'unsupported_format', message: 'Unexpected format.' };
    }

    // ── Normalise (centre + scale) ──────────────────────────────────────────
    normaliseRoot(loadedRoot);
    loadedRoot.updateMatrixWorld(true);

    // ── Merge geometry for overlays ─────────────────────────────────────────
    const mergedGeo = mergeGeometries(loadedRoot);
    if (!mergedGeo) {
      return {
        ok: false,
        error: 'empty_geometry',
        message: 'The file loaded but contains no visible geometry.',
      };
    }

    const triangleCount = mergedGeo.attributes.position.count / 3;

    // ── Build the PerspX Group ──────────────────────────────────────────────
    const group = new Group();

    // 1. Display mesh — starts in primitive mode (semitransparent fill)
    const primitiveColor = nextModelColor();
    const displayMesh = buildDisplayMesh(loadedRoot, primitiveColor);
    group.add(displayMesh);


    // 2–6. Overlays computed from merged geometry
    const { defaultEdges, xyzEdges, halfLines, thirdLines, crossLines } =
      buildOverlays(mergedGeo);
    group.add(defaultEdges, xyzEdges, halfLines, thirdLines, crossLines);

    // Dispose the temporary merged geometry (overlays have their own copies)
    mergedGeo.dispose();

    return {
      ok: true,
      group,
      name: fileBaseName(file.name),
      triangleCount,
      hasPerformanceWarning: triangleCount > MODEL_WARN_TRIANGLE_COUNT,
    };
  } catch (err: any) {
    console.error('[PerspX] Model load error:', err);
    return {
      ok: false,
      error: 'parse_error',
      message: err?.message ?? 'An unknown error occurred while parsing the file.',
    };
  }
}
