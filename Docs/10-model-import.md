# 10 — Model Import

## Goal
Allow users to import their own 3D models (glTF, OBJ, FBX) into the scene. Handle loading, normalization, and integration with the SceneManager.

---

## Supported Formats

| Format    | Extension       | Loader                    | Notes                                           |
| :-------- | :-------------- | :------------------------ | :---------------------------------------------- |
| **glTF**  | `.gltf`, `.glb` | `GLTFLoader`              | ★ Recommended — compact, PBR materials, standard |
| **OBJ**   | `.obj` + `.mtl` | `OBJLoader` + `MTLLoader` | Legacy but widely used                           |
| **FBX**   | `.fbx`          | `FBXLoader`               | Common in game dev — supports animations         |
| **STL**   | `.stl`          | `STLLoader`               | 3D printing format — geometry only               |

---

## Implementation

### `src/objects/model-loader.ts`

```ts
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import {
  Group,
  Box3,
  Vector3,
  Mesh,
  BufferGeometry,
  Object3D,
} from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import type { SceneManager } from '@/core/scene';

export interface LoadResult {
  id: string;
  object: Object3D;
  name: string;
  boundingBox: Box3;
  vertexCount: number;
  triangleCount: number;
}

export interface LoadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export class ModelLoader {
  private gltfLoader: GLTFLoader;
  private objLoader: OBJLoader;
  private fbxLoader: FBXLoader;
  private stlLoader: STLLoader;
  private sceneManager: SceneManager;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;

    // GLTF with Draco compression support
    this.gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    this.gltfLoader.setDRACOLoader(dracoLoader);

    this.objLoader = new OBJLoader();
    this.fbxLoader = new FBXLoader();
    this.stlLoader = new STLLoader();
  }

  /**
   * Load a model from a File object (drag-and-drop or file picker)
   */
  async loadFromFile(
    file: File,
    onProgress?: (progress: LoadProgress) => void
  ): Promise<LoadResult> {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const url = URL.createObjectURL(file);

    try {
      let object: Object3D;

      switch (extension) {
        case 'glb':
        case 'gltf':
          object = await this.loadGLTF(url, onProgress);
          break;
        case 'obj':
          object = await this.loadOBJ(url, onProgress);
          break;
        case 'fbx':
          object = await this.loadFBX(url, onProgress);
          break;
        case 'stl':
          object = await this.loadSTL(url, onProgress);
          break;
        default:
          throw new Error(`Unsupported format: .${extension}`);
      }

      // Normalize the model
      const normalized = this.normalizeModel(object);

      // Enable shadows on all meshes
      normalized.traverse((child) => {
        if ((child as Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Extract filename without extension for naming
      const name = file.name.replace(/\.[^.]+$/, '');

      // Add to scene
      const id = this.sceneManager.addObject(normalized, 'model', name);

      // Get stats
      const stats = this.getModelStats(normalized);

      return {
        id,
        object: normalized,
        name,
        boundingBox: stats.boundingBox,
        vertexCount: stats.vertexCount,
        triangleCount: stats.triangleCount,
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Load a model from a URL (built-in models)
   */
  async loadFromURL(
    url: string,
    name: string,
    onProgress?: (progress: LoadProgress) => void
  ): Promise<LoadResult> {
    const extension = url.split('.').pop()?.toLowerCase()?.split('?')[0];
    let object: Object3D;

    switch (extension) {
      case 'glb':
      case 'gltf':
        object = await this.loadGLTF(url, onProgress);
        break;
      default:
        throw new Error(`Unsupported format for URL loading: .${extension}`);
    }

    const normalized = this.normalizeModel(object);
    normalized.traverse((child) => {
      if ((child as Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const id = this.sceneManager.addObject(normalized, 'model', name);
    const stats = this.getModelStats(normalized);

    return {
      id,
      object: normalized,
      name,
      boundingBox: stats.boundingBox,
      vertexCount: stats.vertexCount,
      triangleCount: stats.triangleCount,
    };
  }

  // --- Loaders ---

  private loadGLTF(url: string, onProgress?: (p: LoadProgress) => void): Promise<Object3D> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => resolve(gltf.scene),
        (event) => {
          if (onProgress && event.total > 0) {
            onProgress({
              loaded: event.loaded,
              total: event.total,
              percent: (event.loaded / event.total) * 100,
            });
          }
        },
        reject
      );
    });
  }

  private loadOBJ(url: string, onProgress?: (p: LoadProgress) => void): Promise<Object3D> {
    return new Promise((resolve, reject) => {
      this.objLoader.load(
        url,
        (obj) => resolve(obj),
        (event) => {
          if (onProgress && event.total > 0) {
            onProgress({
              loaded: event.loaded,
              total: event.total,
              percent: (event.loaded / event.total) * 100,
            });
          }
        },
        reject
      );
    });
  }

  private loadFBX(url: string, onProgress?: (p: LoadProgress) => void): Promise<Object3D> {
    return new Promise((resolve, reject) => {
      this.fbxLoader.load(
        url,
        (fbx) => resolve(fbx),
        (event) => {
          if (onProgress && event.total > 0) {
            onProgress({
              loaded: event.loaded,
              total: event.total,
              percent: (event.loaded / event.total) * 100,
            });
          }
        },
        reject
      );
    });
  }

  private loadSTL(url: string, onProgress?: (p: LoadProgress) => void): Promise<Object3D> {
    return new Promise((resolve, reject) => {
      this.stlLoader.load(
        url,
        (geometry: BufferGeometry) => {
          const material = new MeshStandardNodeMaterial({ color: 0x888888, roughness: 0.5 });
          const mesh = new Mesh(geometry, material);
          resolve(mesh);
        },
        (event) => {
          if (onProgress && event.total > 0) {
            onProgress({
              loaded: event.loaded,
              total: event.total,
              percent: (event.loaded / event.total) * 100,
            });
          }
        },
        reject
      );
    });
  }

  // --- Normalization ---

  /**
   * Normalize model to fit within a unit bounding box centered at origin.
   * This ensures imported models appear at a consistent size.
   */
  private normalizeModel(object: Object3D): Object3D {
    const box = new Box3().setFromObject(object);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim === 0) return object;

    const targetSize = 2; // Normalize to 2 units
    const scale = targetSize / maxDim;

    const wrapper = new Group();
    wrapper.add(object);

    // Center and scale
    object.position.sub(center);
    wrapper.scale.setScalar(scale);

    return wrapper;
  }

  // --- Stats ---

  private getModelStats(object: Object3D): {
    boundingBox: Box3;
    vertexCount: number;
    triangleCount: number;
  } {
    const box = new Box3().setFromObject(object);
    let vertices = 0;
    let triangles = 0;

    object.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh;
        const geo = mesh.geometry;
        if (geo.index) {
          triangles += geo.index.count / 3;
        } else if (geo.attributes.position) {
          triangles += geo.attributes.position.count / 3;
        }
        if (geo.attributes.position) {
          vertices += geo.attributes.position.count;
        }
      }
    });

    return { boundingBox: box, vertexCount: vertices, triangleCount: triangles };
  }
}
```

### Drag-and-Drop Support

```ts
// In main app initialization:
function setupDragAndDrop(
  canvas: HTMLCanvasElement,
  modelLoader: ModelLoader
): void {
  canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    canvas.style.outline = '2px solid #4a9eff';
  });

  canvas.addEventListener('dragleave', () => {
    canvas.style.outline = 'none';
  });

  canvas.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    canvas.style.outline = 'none';

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        const result = await modelLoader.loadFromFile(file, (progress) => {
          console.log(`Loading ${file.name}: ${progress.percent.toFixed(0)}%`);
        });
        console.log(`Loaded: ${result.name} (${result.vertexCount} verts, ${result.triangleCount} tris)`);
      } catch (err) {
        console.error(`Failed to load ${file.name}:`, err);
      }
    }
  });
}
```

---

## File Picker (Alternative to Drag-and-Drop)

```ts
function openFilePicker(modelLoader: ModelLoader): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.glb,.gltf,.obj,.fbx,.stl';
  input.multiple = true;

  input.onchange = async () => {
    if (!input.files) return;
    for (const file of Array.from(input.files)) {
      await modelLoader.loadFromFile(file);
    }
  };

  input.click();
}
```

---

## Verification

- Drag-and-drop a `.glb` file → model appears in scene, centered and scaled
- Import via file picker works the same way
- OBJ, FBX, STL formats all load correctly
- Large models are normalized to fit within the scene
- Model stats (vertex count, triangle count) are logged
- Loading progress callback fires during load
- Imported models work with selection, transforms, and materials

---

## Output

After this phase, you have:
- [x] 4 format loaders (glTF/GLB, OBJ, FBX, STL)
- [x] Draco compression support for optimized glTF
- [x] Automatic model normalization (centering + scaling)
- [x] Drag-and-drop file import
- [x] File picker import
- [x] Loading progress callback
- [x] Model statistics (vertices, triangles, bounding box)
- [x] Full SceneManager integration

---

## Next → [11-ui-system.md](./11-ui-system.md)
