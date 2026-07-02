# 02 — Core Renderer

## Goal
Initialize the Three.js WebGPU renderer, create a render loop, and display a test object to confirm everything works.

---

## Key Concepts

### WebGPURenderer vs WebGLRenderer
Three.js's `WebGPURenderer` is the modern path. It:
- Uses **WebGPU** when available (native GPU compute + render)
- Falls back to **WebGL2** automatically on older devices
- Supports **TSL** (Three Shader Language) for cross-API shaders
- No code changes needed between WebGPU and WebGL2 modes

### Render Loop Architecture
We use a dedicated render loop class to:
- Decouple the update logic from rendering
- Support fixed-timestep updates for consistent behavior
- Provide hooks for pre/post render callbacks

---

## Implementation

### `src/core/renderer.ts`

```ts
import { WebGPURenderer } from 'three/webgpu';
import { Scene, Color, type ColorRepresentation } from 'three';

export interface RendererOptions {
  canvas: HTMLCanvasElement;
  antialias?: boolean;
  backgroundColor?: ColorRepresentation;
}

export class Renderer {
  public readonly instance: WebGPURenderer;
  public readonly scene: Scene;

  constructor(options: RendererOptions) {
    this.instance = new WebGPURenderer({
      canvas: options.canvas,
      antialias: options.antialias ?? true,
    });

    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for perf
    this.instance.setClearColor(new Color(options.backgroundColor ?? 0x1a1a2e));

    this.scene = new Scene();

    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.instance.setSize(width, height);
  }

  async init(): Promise<void> {
    await this.instance.init(); // WebGPU requires async init
  }

  getAspect(): number {
    return window.innerWidth / window.innerHeight;
  }

  dispose(): void {
    window.removeEventListener('resize', () => this.handleResize());
    this.instance.dispose();
  }
}
```

### `src/core/loop.ts`

```ts
import type { WebGPURenderer } from 'three/webgpu';
import type { Scene, Camera } from 'three';

export type UpdateCallback = (deltaTime: number, elapsedTime: number) => void;

export class RenderLoop {
  private animationId: number | null = null;
  private lastTime = 0;
  private elapsed = 0;
  private updateCallbacks: UpdateCallback[] = [];

  constructor(
    private renderer: WebGPURenderer,
    private scene: Scene,
    private camera: Camera
  ) {}

  onUpdate(callback: UpdateCallback): void {
    this.updateCallbacks.push(callback);
  }

  start(): void {
    this.lastTime = performance.now();
    this.tick();
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private tick = (): void => {
    this.animationId = requestAnimationFrame(this.tick);

    const now = performance.now();
    const delta = (now - this.lastTime) / 1000; // seconds
    this.lastTime = now;
    this.elapsed += delta;

    // Run all update callbacks
    for (const cb of this.updateCallbacks) {
      cb(delta, this.elapsed);
    }

    // Render
    this.renderer.render(this.scene, this.camera);
  };

  setCamera(camera: Camera): void {
    this.camera = camera;
  }
}
```

### `src/main.ts` (initial version)

```ts
import { Renderer } from '@/core/renderer';
import { RenderLoop } from '@/core/loop';
import { PerspectiveCamera, BoxGeometry, Mesh } from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';

async function init() {
  const canvas = document.getElementById('viewport') as HTMLCanvasElement;
  if (!canvas) throw new Error('Canvas #viewport not found');

  // Create renderer
  const renderer = new Renderer({ canvas });
  await renderer.init();

  // Create camera
  const camera = new PerspectiveCamera(50, renderer.getAspect(), 0.1, 1000);
  camera.position.set(3, 3, 3);
  camera.lookAt(0, 0, 0);

  // Add a test cube
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshStandardNodeMaterial({ color: 0x4a9eff });
  const cube = new Mesh(geometry, material);
  renderer.scene.add(cube);

  // Start render loop
  const loop = new RenderLoop(renderer.instance, renderer.scene, camera);
  loop.onUpdate((dt) => {
    cube.rotation.y += dt * 0.5;
  });
  loop.start();

  // Handle resize
  window.addEventListener('resize', () => {
    camera.aspect = renderer.getAspect();
    camera.updateProjectionMatrix();
  });
}

init().catch(console.error);
```

---

## Verification

```bash
npm run dev
```

- A blue cube rotates slowly on a dark background
- The canvas fills the entire viewport
- Resizing the window adjusts the aspect ratio correctly
- Check DevTools console: should show `WebGPU` backend (or `WebGL2` fallback)

---

## Performance Notes

- `setPixelRatio(Math.min(devicePixelRatio, 2))` prevents 3x/4x rendering on high-DPI mobile screens — critical for performance
- The render loop uses `requestAnimationFrame` which automatically throttles to display refresh rate
- Delta time ensures consistent animation speed across frame rates

---

## Output

After this phase, you have:
- [x] WebGPU renderer with automatic WebGL2 fallback
- [x] Responsive canvas with DPI handling
- [x] Render loop with delta time and update hooks
- [x] A test cube confirming the pipeline works

---

## Next → [03-scene-management.md](./03-scene-management.md)
