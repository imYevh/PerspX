# 14 — Export System

## Goal
Allow users to save their work: screenshots of the viewport, export the full scene, and save/load scene configurations.

---

## Export Types

| Export Type       | Format           | Use Case                                    |
| :---------------- | :--------------- | :------------------------------------------ |
| **Screenshot**    | PNG / JPEG       | Capture the viewport for reference drawing  |
| **Scene File**    | JSON (.PerspX)   | Save/load entire scene state                |
| **Model Export**  | glTF (.glb)      | Export scene as a 3D model                  |

---

## Implementation

### `src/utils/export.ts`

```ts
import { WebGPURenderer } from 'three/webgpu';
import { Scene, Camera } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import type { SceneManager, SceneObjectMeta } from '@/core/scene';

// --- Screenshots ---

export interface ScreenshotOptions {
  width?: number;
  height?: number;
  format?: 'png' | 'jpeg';
  quality?: number; // 0-1, for JPEG
  transparent?: boolean;
}

export async function captureScreenshot(
  renderer: WebGPURenderer,
  scene: Scene,
  camera: Camera,
  options: ScreenshotOptions = {}
): Promise<Blob> {
  const {
    width = renderer.domElement.width,
    height = renderer.domElement.height,
    format = 'png',
    quality = 0.92,
  } = options;

  // Render one frame
  renderer.render(scene, camera);

  // Get canvas data
  const canvas = renderer.domElement;

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to capture screenshot'));
      },
      `image/${format}`,
      quality
    );
  });
}

export async function downloadScreenshot(
  renderer: WebGPURenderer,
  scene: Scene,
  camera: Camera,
  filename?: string,
  options?: ScreenshotOptions
): Promise<void> {
  const blob = await captureScreenshot(renderer, scene, camera, options);
  const url = URL.createObjectURL(blob);
  const ext = options?.format ?? 'png';

  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `PerspX-${Date.now()}.${ext}`;
  a.click();

  URL.revokeObjectURL(url);
}

// --- Scene Save/Load ---

export interface PerspXScene {
  version: string;
  name: string;
  createdAt: string;
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    fov: number;
    mode: 'perspective' | 'orthographic';
  };
  objects: Array<{
    meta: SceneObjectMeta;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    primitiveType?: string;
    materialColor?: string;
  }>;
  lighting: {
    preset?: string;
  };
  helpers: {
    grid: boolean;
    axes: boolean;
    ground: boolean;
  };
}

export function serializeScene(
  sceneManager: SceneManager,
  cameraState: { position: any; target: any; fov: number; mode: string },
  helperState: { grid: boolean; axes: boolean; ground: boolean }
): PerspXScene {
  const objects = sceneManager.getAllObjects().map(({ id, object, meta }) => ({
    meta,
    position: [object.position.x, object.position.y, object.position.z] as [number, number, number],
    rotation: [object.rotation.x, object.rotation.y, object.rotation.z] as [number, number, number],
    scale: [object.scale.x, object.scale.y, object.scale.z] as [number, number, number],
    primitiveType: object.userData.primitiveType,
    materialColor: object.userData.materialColor,
  }));

  return {
    version: '1.0.0',
    name: 'Untitled Scene',
    createdAt: new Date().toISOString(),
    camera: {
      position: [cameraState.position.x, cameraState.position.y, cameraState.position.z],
      target: [cameraState.target.x, cameraState.target.y, cameraState.target.z],
      fov: cameraState.fov,
      mode: cameraState.mode as 'perspective' | 'orthographic',
    },
    objects,
    lighting: {},
    helpers: helperState,
  };
}

export function saveSceneToFile(scene: PerspXScene, filename?: string): void {
  const json = JSON.stringify(scene, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `${scene.name.replace(/\s+/g, '-')}.PerspX.json`;
  a.click();

  URL.revokeObjectURL(url);
}

export async function loadSceneFromFile(): Promise<PerspXScene | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.PerspX.json';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }

      try {
        const text = await file.text();
        const scene = JSON.parse(text) as PerspXScene;

        if (!scene.version || !scene.objects) {
          throw new Error('Invalid PerspX scene file');
        }

        resolve(scene);
      } catch (err) {
        console.error('Failed to load scene:', err);
        resolve(null);
      }
    };

    input.click();
  });
}

// --- glTF Export ---

export async function exportSceneAsGLTF(
  scene: Scene,
  filename?: string
): Promise<void> {
  const exporter = new GLTFExporter();

  const result = await exporter.parseAsync(scene, {
    binary: true, // Export as .glb
    onlyVisible: true,
  });

  const blob = new Blob(
    [result as ArrayBuffer],
    { type: 'application/octet-stream' }
  );
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `PerspX-export-${Date.now()}.glb`;
  a.click();

  URL.revokeObjectURL(url);
}
```

### Keyboard Shortcuts for Export

```ts
window.addEventListener('keydown', (e) => {
  // Ctrl+S: Save scene
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    const scene = serializeScene(sceneManager, cameraState, helperState);
    saveSceneToFile(scene);
  }

  // Ctrl+Shift+S: Screenshot
  if (e.ctrlKey && e.shiftKey && e.key === 'S') {
    e.preventDefault();
    downloadScreenshot(renderer.instance, renderer.scene, cameraController.camera);
  }

  // Ctrl+O: Open scene
  if (e.ctrlKey && e.key === 'o') {
    e.preventDefault();
    loadSceneFromFile().then((scene) => {
      if (scene) applyLoadedScene(scene);
    });
  }
});
```

---

## Verification

- `Ctrl+Shift+S` downloads a PNG screenshot of the current viewport
- `Ctrl+S` saves the scene as a `.PerspX.json` file
- `Ctrl+O` opens a file picker and loads a saved scene
- Loaded scenes restore all objects, camera position, and helper states
- glTF export produces a valid `.glb` file viewable in other 3D tools
- Screenshots work on both desktop and mobile (via UI button)

---

## Output

After this phase, you have:
- [x] Viewport screenshot (PNG/JPEG) with download
- [x] Scene save/load (.PerspX.json format)
- [x] glTF/GLB scene export
- [x] Keyboard shortcuts (Ctrl+S, Ctrl+Shift+S, Ctrl+O)
- [x] Scene serialization preserving all object state

---

## Next → [15-packaging.md](./15-packaging.md)
