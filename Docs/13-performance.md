# 13 — Performance Optimization

## Goal
Ensure PerspX runs at 60 FPS on mid-range devices with 100+ objects. Apply optimizations from the start — it's cheaper to build with performance in mind than to retrofit.

---

## Performance Budget

| Metric              | Target             | Measurement                     |
| :------------------ | :----------------- | :------------------------------ |
| **Frame Rate**      | 60 FPS             | `requestAnimationFrame` timing  |
| **Frame Time**      | < 16.6ms           | Performance API                 |
| **Draw Calls**      | < 100 per frame    | `renderer.info.render.calls`    |
| **Triangles**       | < 500K visible     | `renderer.info.render.triangles`|
| **Memory (JS)**     | < 200 MB           | `performance.memory`            |
| **Bundle Size**     | < 1 MB gzipped     | Vite build output               |
| **First Load**      | < 3 seconds        | Lighthouse                      |

---

## Optimization Strategies

### 1. Geometry Instancing

When the scene has multiple copies of the same primitive, use `InstancedMesh` instead of separate meshes.

```ts
import { InstancedMesh, Matrix4, BoxGeometry, Color } from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';

/**
 * Batch identical geometries into a single draw call.
 * Useful when the user adds many cubes/spheres to the scene.
 */
export function createInstancedPrimitive(
  geometry: BufferGeometry,
  count: number,
  color: number = 0x4a9eff
): InstancedMesh {
  const material = new MeshStandardNodeMaterial({ color: new Color(color) });
  const instanced = new InstancedMesh(geometry, material, count);
  instanced.castShadow = true;
  instanced.receiveShadow = true;

  // Initialize transforms
  const matrix = new Matrix4();
  for (let i = 0; i < count; i++) {
    matrix.identity();
    instanced.setMatrixAt(i, matrix);
  }
  instanced.instanceMatrix.needsUpdate = true;

  return instanced;
}
```

### 2. Frustum Culling

Three.js has built-in frustum culling enabled by default (`object.frustumCulled = true`). Ensure it stays enabled on all objects.

### 3. Level of Detail (LOD)

```ts
import { LOD, SphereGeometry, Mesh } from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';

/**
 * Create an LOD group for a sphere that reduces
 * polygon count at distance.
 */
export function createLODSphere(color: number): LOD {
  const lod = new LOD();
  const material = new MeshStandardNodeMaterial({ color });

  // High quality — close
  lod.addLevel(new Mesh(new SphereGeometry(0.5, 32, 16), material), 0);
  // Medium — mid range
  lod.addLevel(new Mesh(new SphereGeometry(0.5, 16, 8), material), 10);
  // Low — far away
  lod.addLevel(new Mesh(new SphereGeometry(0.5, 8, 4), material), 30);

  return lod;
}
```

### 4. Shadow Map Optimization

```ts
// Only enable shadows on the main directional light
// Use lower resolution on mobile
const isMobile = window.innerWidth < 768;

directionalLight.shadow.mapSize.set(
  isMobile ? 1024 : 2048,
  isMobile ? 1024 : 2048
);

// Tighten the shadow camera frustum to the scene bounds
directionalLight.shadow.camera.left = -15;
directionalLight.shadow.camera.right = 15;
directionalLight.shadow.camera.top = 15;
directionalLight.shadow.camera.bottom = -15;
```

### 5. Geometry Disposal

Always dispose geometry and materials when removing objects (already handled in `SceneManager.removeObject()`).

### 6. Texture Optimization

```ts
// When loading textures, use appropriate sizes
import { TextureLoader, SRGBColorSpace } from 'three';

const loader = new TextureLoader();

function loadOptimizedTexture(url: string, maxSize: number = 1024): Promise<Texture> {
  return new Promise((resolve) => {
    loader.load(url, (texture) => {
      texture.colorSpace = SRGBColorSpace;
      // Resize if needed (done via canvas)
      if (texture.image.width > maxSize || texture.image.height > maxSize) {
        const canvas = document.createElement('canvas');
        const scale = maxSize / Math.max(texture.image.width, texture.image.height);
        canvas.width = texture.image.width * scale;
        canvas.height = texture.image.height * scale;
        canvas.getContext('2d')!.drawImage(texture.image, 0, 0, canvas.width, canvas.height);
        texture.image = canvas;
        texture.needsUpdate = true;
      }
      resolve(texture);
    });
  });
}
```

### 7. Render Loop Optimization

```ts
// Only re-render when something changes (optional — saves battery on mobile)
export class SmartRenderLoop {
  private needsRender = true;
  private renderCount = 0;

  requestRender(): void {
    this.needsRender = true;
  }

  tick(renderer: WebGPURenderer, scene: Scene, camera: Camera): void {
    if (!this.needsRender && this.renderCount > 2) return;

    renderer.render(scene, camera);
    this.renderCount++;

    if (this.needsRender) {
      this.needsRender = false;
      this.renderCount = 0;
    }
  }
}
```

### 8. Performance Monitor

```ts
/**
 * Lightweight FPS and draw call monitor for the HUD
 */
export class PerformanceMonitor {
  private frames = 0;
  private lastTime = performance.now();
  public fps = 60;
  public drawCalls = 0;
  public triangles = 0;

  update(rendererInfo: any): void {
    this.frames++;
    const now = performance.now();
    const elapsed = now - this.lastTime;

    if (elapsed >= 1000) {
      this.fps = Math.round((this.frames * 1000) / elapsed);
      this.frames = 0;
      this.lastTime = now;
    }

    this.drawCalls = rendererInfo.render.calls;
    this.triangles = rendererInfo.render.triangles;
  }

  getDisplay(): string {
    return `${this.fps} FPS | ${this.drawCalls} draws | ${(this.triangles / 1000).toFixed(1)}K tris`;
  }
}
```

---

## Mobile-Specific Optimizations

| Optimization                    | Implementation                                    |
| :------------------------------ | :------------------------------------------------ |
| Cap pixel ratio at 2x           | `renderer.setPixelRatio(Math.min(dpr, 2))`       |
| Reduce shadow map size          | 1024×1024 instead of 2048×2048                   |
| Lower LOD thresholds            | Switch to low-poly earlier                        |
| Disable anti-aliasing on low-end| Check `navigator.hardwareConcurrency < 4`         |
| Reduce max objects warning      | Warn at 50 objects on mobile vs 200 on desktop    |

---

## Bundle Size Optimization (Vite)

```ts
// vite.config.ts additions
export default defineConfig({
  build: {
    target: 'es2022',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          loaders: [
            'three/addons/loaders/GLTFLoader.js',
            'three/addons/loaders/FBXLoader.js',
            'three/addons/loaders/OBJLoader.js',
          ],
        },
      },
    },
    sourcemap: false, // Disable in production
  },
});
```

---

## Verification

- FPS counter shows stable 60 FPS with 20 objects
- Adding 100 primitives keeps FPS above 30
- Draw calls stay under 100 with instancing
- No memory leaks after adding and removing objects repeatedly
- Mobile devices (iPhone 12+, Pixel 6+) maintain 30+ FPS
- Bundle size < 1 MB gzipped
- Performance monitor is toggleable in the HUD

---

## Output

After this phase, you have:
- [x] Geometry instancing for batched primitives
- [x] LOD system for distance-based detail reduction
- [x] Shadow map optimization per platform
- [x] Smart render loop (render-on-demand option)
- [x] Performance monitor (FPS, draw calls, triangles)
- [x] Bundle splitting for lazy-loading loaders
- [x] Mobile-specific DPI and quality caps

---

## Next → [14-export-system.md](./14-export-system.md)
