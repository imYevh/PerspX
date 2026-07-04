# PerspX — Waterfall Task Tracker

> One phase at a time. **Do not start the next phase until all tasks in the current one are checked off.**
> Each task tells you exactly which file to create/edit, what to copy, and what to verify.

---

## How to use this file

1. Work through phases **top to bottom** — each phase depends on the previous one.
2. When you start a task, change `[ ]` → `[/]` (in progress).
3. When you finish it, change `[/]` → `[x]` (done).
4. When **all tasks** in a phase are `[x]`, move to the next phase.
5. If you get stuck, the reference doc for each phase is linked next to the phase title.

---

## Phase 1 — Project Setup · [01-project-setup.md](./01-project-setup.md)

**Goal:** Create the folder, install packages, and get a black canvas in the browser.
You will type some terminal commands and paste some config code.

---

### 1.1 — Open a terminal in your project folder

- [x] Open VS Code and open the `PerspX` folder
- [x] Open the integrated terminal (`Ctrl + Backtick`)
- [x] Confirm you are in the right folder: run `pwd` (should end in `/PerspX`)

---

### 1.2 — Scaffold SvelteKit

- [x] Run this command exactly:
  ```bash
  npx -y sv create ./ --template minimal --types ts --no-add-ons
  ```
- [x] When it finishes, run `ls` — you should now see `src/`, `package.json`, `svelte.config.js`

> **What this does:** Creates a minimal SvelteKit + TypeScript project in your current folder.

---

### 1.3 — Install Three.js

- [x] Run:
  ```bash
  npm install three
  npm install -D @types/three @sveltejs/adapter-static
  ```
- [x] Run `cat package.json` — check that `"three"` appears under `"dependencies"`

> **What this does:** Adds the Three.js 3D library and its TypeScript type definitions.

---

### 1.4 — Configure SvelteKit for SPA mode

- [x] Open `svelte.config.js` and **replace its entire contents** with:

  ```js
  import adapter from "@sveltejs/adapter-static";
  import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

  const config = {
    preprocess: vitePreprocess(),
    kit: {
      adapter: adapter({
        fallback: "index.html",
      }),
      alias: {
        $lib: "./src/lib",
        "$lib/*": "./src/lib/*",
      },
    },
  };

  export default config;
  ```

- [x] Save the file

> **Why:** SPA mode means the whole app is one HTML page — no server-side rendering. Required for Tauri.

---

### 1.5 — Configure Vite

- [x] Open `vite.config.ts` and **replace its entire contents** with:

  ```ts
  import { sveltekit } from "@sveltejs/kit/vite";
  import { defineConfig } from "vite";

  export default defineConfig({
    plugins: [sveltekit()],
    build: { target: "es2022" },
    server: { port: 3000, open: true },
  });
  ```

- [x] Save the file

---

### 1.6 — Disable SSR

- [x] Create a new file: `src/routes/+layout.ts`
- [x] Paste into it:
  ```ts
  export const prerender = true;
  export const ssr = false;
  ```
- [x] Save the file

> **Why:** Without this, SvelteKit tries to render on the server. Three.js needs the browser — no server rendering.

---

### 1.7 — Create the directory structure

- [x] Run these commands one by one:
  ```bash
  mkdir -p src/lib/core
  mkdir -p src/lib/camera
  mkdir -p src/lib/objects
  mkdir -p src/lib/transforms
  mkdir -p src/lib/lighting
  mkdir -p src/lib/materials
  mkdir -p src/lib/helpers
  mkdir -p src/lib/components/panels
  mkdir -p src/lib/stores
  mkdir -p src/lib/utils
  mkdir -p static/models
  mkdir -p static/textures
  ```
- [x] Run `ls src/lib/` — you should see all the folders listed above

---

### 1.8 — Create the HTML shell

- [x] Open `src/app.html`
- [x] Replace its contents with:
  ```html
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0, user-scalable=no"
      />
      <meta
        name="description"
        content="PerspX -- 3D Perspective Visualization Tool for Artists"
      />
      <title>PerspX</title>
      <link rel="icon" href="%sveltekit.assets%/favicon.png" />
      %sveltekit.head%
    </head>
    <body data-sveltekit-preload-data="hover">
      <div id="app">%sveltekit.body%</div>
    </body>
  </html>
  ```
- [x] Save the file

---

### 1.9 — Create global styles

- [x] Create a new file: `src/app.css`
- [x] Paste into it:

  ```css
  *,
  *::before,
  *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html,
  body {
    width: 100%;
    height: 100%;
    overflow: hidden;
    font-family:
      "Inter",
      system-ui,
      -apple-system,
      sans-serif;
    background: #0a0a0a;
    color: #e0e0e0;
  }

  #app {
    width: 100%;
    height: 100%;
    position: relative;
  }
  ```

- [x] Save the file

---

### 1.10 — Create root layout

- [x] Open (or create) `src/routes/+layout.svelte`
- [x] Replace its contents with:

  ```svelte
  <script>
    import '../app.css';
    let { children } = $props();
  </script>

  {@render children()}
  ```

- [x] Save the file

---

### 1.11 — Create the main page with a canvas

- [x] Open (or create) `src/routes/+page.svelte`
- [x] Replace its contents with:

  ```svelte
  <script lang="ts">
    import { onMount } from 'svelte';

    let canvas: HTMLCanvasElement;

    onMount(() => {
      console.log('Canvas ready:', canvas);
    });
  </script>

  <canvas bind:this={canvas} id="viewport"></canvas>

  <style>
    #viewport {
      display: block;
      width: 100%;
      height: 100%;
      touch-action: none;
    }
  </style>
  ```

- [x] Save the file

---

### 1.12 — Run and verify

- [x] Run: `npm run dev`
- [x] Browser opens at `http://localhost:3000`
- [x] You see a **solid black screen** (that's the canvas — correct!)
- [x] Open DevTools (`F12`) — Console — No red errors
- [x] Edit something in `+page.svelte`, save, and see the page update instantly (HMR)
- [x] Stop the dev server with `Ctrl + C`

**Phase 1 complete — you have a working project skeleton.**

---

---

## Phase 2 — Core Renderer · [02-core-renderer.md](./02-core-renderer.md)

**Goal:** Initialize Three.js and get a spinning cube on screen to prove the 3D engine works.

---

### 2.1 — Create the Renderer module

- [x] Create new file: `src/lib/core/renderer.ts`
- [x] Open `02-core-renderer.md` and copy the full `renderer.ts` code block into this file
- [x] Save the file

> **What this does:** Sets up the Three.js WebGPU renderer (with WebGL2 fallback) on the canvas element.

---

### 2.2 — Create the Render Loop module

- [x] Create new file: `src/lib/core/loop.ts`
- [x] Copy the `loop.ts` code block from `02-core-renderer.md` into this file
- [x] Save the file

> **What this does:** Uses `requestAnimationFrame` to run your render function ~60 times per second.

---

### 2.3 — Create the Scene module

- [x] Create new file: `src/lib/core/scene.ts`
- [x] Copy the `scene.ts` code block from `02-core-renderer.md` into this file
- [x] Save the file

---

### 2.4 — Wire everything into the main page

- [x] Open `src/routes/+page.svelte`
- [x] Replace the `onMount` block to initialize the renderer, scene, and loop
- [x] Follow the integration example in `02-core-renderer.md` ("Wiring into SvelteKit" section)
- [x] Save the file

---

### 2.5 — Run and verify

- [x] Run: `npm run dev`
- [x] You see a **3D cube rotating** in the browser
- [x] No console errors
- [x] The cube keeps spinning smoothly at 60fps
- [x] Stop the dev server

**Phase 2 complete — Three.js is alive.**

---

---

## Phase 3 — Scene Management · [03-scene-management.md](./03-scene-management.md)

**Goal:** Build a system to add, remove, and select objects in the 3D scene. Everything goes through one manager.

---

### 3.1 — Create the SceneManager class

- [x] Open `src/lib/core/scene.ts` (you may already have a stub — replace it)
- [x] Copy the full `SceneManager` class from `03-scene-management.md`
- [x] Save the file

> **Key concept:** The `SceneManager` is the single source of truth for what objects exist in the scene. Every other system talks to it.

---

### 3.2 — Create the scene Svelte store

- [x] Create new file: `src/lib/stores/scene.ts`
- [x] Copy the store code from `03-scene-management.md`
- [x] Save the file

> **What this does:** Exposes scene state (selected objects, object list) to the UI reactively.

---

### 3.3 — Wire SceneManager into the page

- [x] Open `src/routes/+page.svelte`
- [x] Import and initialize `SceneManager` inside `onMount`
- [x] Pass the Three.js `scene` object to it
- [x] Follow the integration section in `03-scene-management.md`
- [x] Save the file

---

### 3.4 — Test object add/remove in the console

- [x] Run `npm run dev`
- [x] Open DevTools Console (`F12`)
- [x] If the SceneManager is exposed to `window` for debugging, type:
  ```js
  window.sceneManager.addObject(new THREE.Mesh(), "model", "box");
  ```
- [x] A box appears in the 3D viewport
- [x] Type:
  ```js
  window.sceneManager.removeObject("box-0");
  ```
- [x] The box disappears

**Phase 3 complete — you can manage scene objects programmatically.**

---

---

## Phase 4 — Camera System · [04-camera-system.md](./04-camera-system.md)

**Goal:** Add orbit controls (rotate, pan, zoom with mouse/touch). Add perspective/orthographic switching.

---

### 4.1 — Create the CameraController

- [x] Create new file: `src/lib/camera/camera-controller.ts`
- [x] Copy the `CameraController` class from `04-camera-system.md`
- [x] Save the file

---

### 4.2 — Create camera presets

- [x] Create new file: `src/lib/camera/camera-presets.ts`
- [x] Copy the presets code from `04-camera-system.md`
- [x] Save the file

> **What presets do:** Pre-configured camera positions like "Front", "Top", "Side" views.

---

### 4.3 — Create the dolly-zoom effect

- [x] Create new file: `src/lib/camera/dolly-zoom.ts`
- [x] Copy the dolly-zoom code from `04-camera-system.md`
- [x] Save the file

> **What this is:** The "Vertigo" effect — zoom and field-of-view change simultaneously to create a cinematic distortion. This is PerspX's signature feature.

---

### 4.4 — Create the camera Svelte store

- [x] Create new file: `src/lib/stores/camera.ts`
- [x] Copy the store code from `04-camera-system.md`
- [x] Save the file

---

### 4.5 — Wire camera into the page

- [x] Open `src/routes/+page.svelte`
- [x] Initialize `CameraController` in `onMount`, passing the canvas and renderer
- [x] Follow the integration example in `04-camera-system.md`
- [x] Save the file

---

### 4.6 — Run and verify

- [x] Run: `npm run dev`
- [x] Left-click + drag — **rotates** the camera around the scene
- [x] Right-click + drag — **pans** the camera
- [x] Scroll wheel — **zooms** in and out
- [x] On mobile (touch screen): pinch to zoom, one finger to orbit

**Phase 4 complete — you can navigate the 3D viewport.**

---

---

## Phase 5 — Primitives Library · [05-primitives-library.md](./05-primitives-library.md)

**Goal:** Let the user add 3D shapes (cube, sphere, cylinder, etc.) to the scene.

---

### 5.1 — Create the primitives module

- [x] Create new file: `src/lib/objects/primitives.ts`
- [x] Copy the primitives code from `05-primitives-library.md`
- [x] This file defines factory functions: `createBox()`, `createSphere()`, `createCylinder()`, etc.
- [x] Save the file

---

### 5.2 — Create the ObjectManager

- [x] Create new file: `src/lib/objects/object-manager.ts`
- [x] Copy the `ObjectManager` class from `05-primitives-library.md`
- [x] Save the file

> **What this does:** Wraps `SceneManager` to handle adding/removing/naming objects with IDs.

---

### 5.3 — Wire ObjectManager into the page

- [x] Open `src/routes/+page.svelte`
- [x] Initialize `ObjectManager` in `onMount` with the `SceneManager`
- [x] Follow the integration example in `05-primitives-library.md`

---

### 5.4 — Add a temporary test button to the UI

- [x] In `+page.svelte`, add a `<button>` that calls `objectManager.add('cube')`
- [x] You can remove this button later once the real UI panel is built in Phase 11

---

### 5.5 — Run and verify

- [x] Run: `npm run dev`
- [x] Click the test button — a cube appears in the scene
- [x] Click multiple times — multiple cubes appear
- [x] Each object has a unique ID (check console logs)

**Phase 5 complete — you can add primitives to the scene.**

**Phase 5 complete — you can populate the scene.**

---

---

## Phase 6 — Transform Controls · [06-transform-controls.md](./06-transform-controls.md)

**Goal:** Click an object to select it. A gizmo (handles) appears — drag it to move/rotate/scale the object.

---

### 6.1 — Create the TransformSystem

- [ ] Create new file: `src/lib/transforms/transform-controls.ts`
- [ ] Copy the full `TransformSystem` class from `06-transform-controls.md`
- [ ] Save the file

> **Key concept:** `TransformSystem` listens for selection events from `SceneManager` and automatically attaches the gizmo to the selected object.

---

### 6.2 — Create the snapping module

- [ ] Create new file: `src/lib/transforms/snapping.ts`
- [ ] Copy the snapping code from `06-transform-controls.md`
- [ ] Save the file

---

### 6.3 — Wire TransformSystem into the page

- [ ] Open `src/routes/+page.svelte`
- [ ] Initialize `TransformSystem` in `onMount` with the camera, canvas, SceneManager, and CameraController
- [ ] Add it to the scene and the render loop
- [ ] Follow the integration example in `06-transform-controls.md`
- [ ] Save the file

---

### 6.4 — Wire object clicking (raycasting)

- [ ] Open `src/lib/core/input.ts` (create it if it doesn't exist yet)
- [ ] Implement a click handler that uses Three.js `Raycaster` to detect which object was clicked
- [ ] When clicked, call `sceneManager.select(objectId)`
- [ ] Follow the raycasting section in `06-transform-controls.md`
- [ ] Save the file

---

### 6.5 — Run and verify

- [ ] Run: `npm run dev`
- [ ] Add a box with your test button
- [ ] Click the box — **gizmo appears** on it
- [ ] Drag a gizmo axis — object **moves** along that axis
- [ ] Press `R` — gizmo switches to **rotate rings**
- [ ] Press `S` — gizmo switches to **scale handles**
- [ ] Press `Escape` — gizmo disappears, object deselects
- [ ] Press `Delete` — selected object is removed
- [ ] While dragging a gizmo, the camera does NOT move

**Phase 6 complete — you can manipulate objects in 3D space.**

---

---

## Phase 7 — Grid & Helpers · [07-grid-and-helpers.md](./07-grid-and-helpers.md)

**Goal:** Add a ground grid, XYZ axis indicator, and vanishing point visualizer to the viewport.

---

### 7.1 — Create the infinite grid

- [ ] Create new file: `src/lib/helpers/grid.ts`
- [ ] Copy the grid code from `07-grid-and-helpers.md`
- [ ] Save the file

---

### 7.2 — Create the axes indicator

- [ ] Create new file: `src/lib/helpers/axes.ts`
- [ ] Copy the axes code from `07-grid-and-helpers.md`
- [ ] Save the file

---

### 7.3 — Create the ground plane

- [ ] Create new file: `src/lib/helpers/ground-plane.ts`
- [ ] Copy the ground plane code from `07-grid-and-helpers.md`
- [ ] Save the file

---

### 7.4 — Create the vanishing points helper

- [ ] Create new file: `src/lib/helpers/vanishing-points.ts`
- [ ] Copy the vanishing points code from `07-grid-and-helpers.md`
- [ ] Save the file

> **What this is:** Lines that converge on the horizon — a key drawing aid for perspective studies.

---

### 7.5 — Wire all helpers into the scene

- [ ] Open `src/routes/+page.svelte`
- [ ] Initialize all helpers in `onMount` and add them to the Three.js scene
- [ ] Follow the integration example in `07-grid-and-helpers.md`
- [ ] Save the file

---

### 7.6 — Run and verify

- [ ] Run: `npm run dev`
- [ ] A **grid** is visible on the ground plane
- [ ] **XYZ axes** are visible (red=X, green=Y, blue=Z)
- [ ] Grid fades at the edges (not a hard cutoff)
- [ ] Vanishing point lines are visible when an object is selected

**Phase 7 complete — the viewport looks like a real 3D tool.**

---

---

## Phase 8 — Lighting System · [08-lighting-system.md](./08-lighting-system.md)

**Goal:** Add dynamic lights to the scene. Include presets (Studio, Outdoor, Dramatic).

---

### 8.1 — Create the LightManager

- [ ] Create new file: `src/lib/lighting/light-manager.ts`
- [ ] Copy the `LightManager` class from `08-lighting-system.md`
- [ ] Save the file

---

### 8.2 — Create lighting presets

- [ ] Create new file: `src/lib/lighting/light-presets.ts`
- [ ] Copy the presets code from `08-lighting-system.md`
- [ ] Save the file

---

### 8.3 — Wire lighting into the page

- [ ] Open `src/routes/+page.svelte`
- [ ] Initialize `LightManager` in `onMount`
- [ ] Apply the default "Studio" preset on startup
- [ ] Follow the integration example in `08-lighting-system.md`
- [ ] Save the file

---

### 8.4 — Run and verify

- [ ] Run: `npm run dev`
- [ ] Objects are **lit** (not flat gray) — shadows and highlights visible
- [ ] Changing the preset changes the mood of the lighting

**Phase 8 complete — the scene has dynamic lighting.**

---

---

## Phase 9 — Shader System · [09-shader-system.md](./09-shader-system.md)

**Goal:** Add custom materials using TSL (Three Shader Language). Built-in shader presets: wireframe, clay, outline.

---

### 9.1 — Create the material system

- [ ] Create new file: `src/lib/materials/material-system.ts`
- [ ] Copy the `MaterialSystem` class from `09-shader-system.md`
- [ ] Save the file

---

### 9.2 — Create the shader library

- [ ] Create new file: `src/lib/materials/shader-library.ts`
- [ ] Copy the shader library code from `09-shader-system.md`
- [ ] Save the file

---

### 9.3 — Create the wireframe overlay

- [ ] Create new file: `src/lib/materials/wireframe.ts`
- [ ] Copy the wireframe code from `09-shader-system.md`
- [ ] Save the file

---

### 9.4 — Wire material system into the page

- [ ] Open `src/routes/+page.svelte`
- [ ] Initialize `MaterialSystem` and apply the default material to new objects
- [ ] Follow the integration example in `09-shader-system.md`
- [ ] Save the file

---

### 9.5 — Run and verify

- [ ] Run: `npm run dev`
- [ ] Objects render with the default material (clay/matte look)
- [ ] Toggling wireframe mode adds an edge overlay on top
- [ ] No shader compilation errors in the console

**Phase 9 complete — you have a custom shader system.**

---

---

## Phase 10 — Model Import · [10-model-import.md](./10-model-import.md)

**Goal:** Let users drag-and-drop or browse for `.glb` (glTF) 3D model files to load into the scene.

---

### 10.1 — Create the model loader

- [ ] Create new file: `src/lib/objects/model-loader.ts`
- [ ] Copy the `ModelLoader` class from `10-model-import.md`
- [ ] Save the file

---

### 10.2 — Add drag-and-drop support to the canvas

- [ ] Open `src/routes/+page.svelte`
- [ ] Add `dragover` and `drop` event listeners on the canvas element
- [ ] On drop, read the file and pass it to `ModelLoader.load()`
- [ ] Follow the drag-and-drop section in `10-model-import.md`
- [ ] Save the file

---

### 10.3 — Add file picker button (temporary)

- [ ] Add a `<input type="file" accept=".glb,.gltf">` element
- [ ] Wire it to call `ModelLoader.load()` on change
- [ ] This will be replaced by the proper UI in Phase 11

---

### 10.4 — Run and verify

- [ ] Run: `npm run dev`
- [ ] Download any free `.glb` file (e.g., from sketchfab.com — free models)
- [ ] Drag the `.glb` file onto the viewport — model loads
- [ ] Model appears in the scene, centered
- [ ] Model is selectable and transformable (gizmos work)
- [ ] Large models load without freezing (async loading)

**Phase 10 complete — you can import 3D models.**

---

---

## Phase 11 — UI System · [11-ui-system.md](./11-ui-system.md)

**Goal:** Build the full application UI — toolbar, side panels (Scene, Properties, Camera, Library), and panel system.

> This is the **longest phase**. Take it one component at a time.

---

### 11.1 — Create the Panel base component

- [ ] Create new file: `src/lib/components/panels/Panel.svelte`
- [ ] Copy the `Panel.svelte` code from `11-ui-system.md`
- [ ] Save the file

> **What this is:** A reusable collapsible panel with a header and slot for content.

---

### 11.2 — Create the Toolbar component

- [ ] Create new file: `src/lib/components/Toolbar.svelte`
- [ ] Copy the `Toolbar.svelte` code from `11-ui-system.md`
- [ ] This toolbar holds: Add Object, Transform Mode, Undo/Redo, Settings
- [ ] Save the file

---

### 11.3 — Create the Scene Panel (object hierarchy)

- [ ] Create new file: `src/lib/components/panels/ScenePanel.svelte`
- [ ] Copy the code from `11-ui-system.md`
- [ ] This shows a list of all objects in the scene, clickable to select
- [ ] Save the file

---

### 11.4 — Create the Properties Panel

- [ ] Create new file: `src/lib/components/panels/PropertiesPanel.svelte`
- [ ] Copy the code from `11-ui-system.md`
- [ ] This shows position/rotation/scale of the selected object with editable inputs
- [ ] Save the file

---

### 11.5 — Create the Camera Panel

- [ ] Create new file: `src/lib/components/panels/CameraPanel.svelte`
- [ ] Copy the code from `11-ui-system.md`
- [ ] This shows FOV slider, camera mode toggle, preset buttons
- [ ] Save the file

---

### 11.6 — Create the Library Panel

- [ ] Create new file: `src/lib/components/panels/LibraryPanel.svelte`
- [ ] Copy the code from `11-ui-system.md`
- [ ] This shows a grid of primitives to add + a file import button
- [ ] Save the file

---

### 11.7 — Create the ViewportOverlay component

- [ ] Create new file: `src/lib/components/ViewportOverlay.svelte`
- [ ] Copy the code from `11-ui-system.md`
- [ ] This shows on-screen labels: FPS counter, selected object name, transform mode
- [ ] Save the file

---

### 11.8 — Create the UI store

- [ ] Create new file: `src/lib/stores/ui.ts`
- [ ] Copy the store from `11-ui-system.md`
- [ ] Save the file

---

### 11.9 — Assemble the full layout

- [ ] Open `src/routes/+layout.svelte`
- [ ] Import and arrange all components: Toolbar at top, panels on sides, canvas in center
- [ ] Follow the layout assembly section in `11-ui-system.md`
- [ ] Remove the temporary test buttons you added in earlier phases
- [ ] Save the file

---

### 11.10 — Run and verify

- [ ] Run: `npm run dev`
- [ ] Toolbar is visible at the top
- [ ] Scene panel lists objects when you add them
- [ ] Clicking an object in the Scene panel selects it in the viewport
- [ ] Properties panel shows the selected object's transform values
- [ ] Changing FOV in Camera panel updates the 3D view in real time
- [ ] Library panel lets you add primitives with one click
- [ ] Panels can be collapsed by clicking their headers

**Phase 11 complete — the app looks and feels like a real tool.**

---

---

## Phase 12 — Responsive Design · [12-responsive-design.md](./12-responsive-design.md)

**Goal:** Make the app work beautifully on phones and tablets with touch input.

---

### 12.1 — Create the BottomSheet component (mobile panels)

- [ ] Create new file: `src/lib/components/BottomSheet.svelte`
- [ ] Copy the code from `12-responsive-design.md`
- [ ] On mobile, panels slide up from the bottom instead of being on the side
- [ ] Save the file

---

### 12.2 — Create the Input module (unified touch + mouse)

- [ ] Open/create `src/lib/core/input.ts`
- [ ] Copy the full input handler from `12-responsive-design.md`
- [ ] This handles: mouse click, touch tap, pinch zoom, two-finger pan
- [ ] Save the file

---

### 12.3 — Update the UI store for responsiveness

- [ ] Open `src/lib/stores/ui.ts`
- [ ] Add a `breakpoint` value that updates when the window resizes
- [ ] Follow the responsive store section in `12-responsive-design.md`
- [ ] Save the file

---

### 12.4 — Add responsive CSS

- [ ] Open `src/app.css`
- [ ] Add mobile media queries from `12-responsive-design.md`
- [ ] At `< 768px`: hide side panels, show bottom sheet, enlarge touch targets
- [ ] Save the file

---

### 12.5 — Wire mobile toolbar (transform mode buttons)

- [ ] Open `Toolbar.svelte`
- [ ] On mobile, show transform mode buttons (R, S) as visible toolbar icons (no keyboard shortcuts on mobile)
- [ ] Follow the mobile toolbar section in `12-responsive-design.md`
- [ ] Save the file

---

### 12.6 — Run and verify

- [ ] Run: `npm run dev`
- [ ] In Chrome DevTools, toggle **device mode** (`Ctrl+Shift+M`) to simulate a phone
- [ ] Layout switches to mobile: panels are gone, bottom sheet appears
- [ ] Tap an object — selects it (touch raycasting works)
- [ ] Pinch — zoom camera
- [ ] One-finger drag — orbit camera
- [ ] Two-finger drag — pan camera

**Phase 12 complete — the app works on phones.**

---

---

## Phase 13 — Performance · [13-performance.md](./13-performance.md)

**Goal:** Keep the app running at 60fps with 100+ objects in the scene.

---

### 13.1 — Add FPS monitoring

- [ ] Open `src/lib/core/loop.ts`
- [ ] Add an FPS counter that calculates frames per second every second
- [ ] Expose it via the `ui` store so the `ViewportOverlay` can display it
- [ ] Follow the monitoring section in `13-performance.md`
- [ ] Save the file

---

### 13.2 — Confirm frustum culling is enabled

- [ ] Open `src/lib/objects/object-manager.ts`
- [ ] Ensure every object has `frustumCulled = true` (Three.js default, but confirm it)
- [ ] Follow the culling section in `13-performance.md`

---

### 13.3 — Add object instancing for repeated shapes

- [ ] Open `src/lib/objects/primitives.ts`
- [ ] Add support for `InstancedMesh` when adding many of the same primitive
- [ ] Follow the instancing section in `13-performance.md`
- [ ] Save the file

---

### 13.4 — Add texture and geometry disposal on remove

- [ ] Open `src/lib/objects/object-manager.ts`
- [ ] In the `removeObject()` method, call `.geometry.dispose()` and `.material.dispose()`
- [ ] This prevents GPU memory leaks
- [ ] Follow the disposal section in `13-performance.md`
- [ ] Save the file

---

### 13.5 — Run and verify

- [ ] Run: `npm run dev`
- [ ] Add 50+ boxes to the scene
- [ ] FPS stays at 60 (or close to it)
- [ ] DevTools Memory tab — no growing leak over time
- [ ] Removing objects and re-adding them doesn't degrade performance

**Phase 13 complete — the app is performant.**

---

---

## Phase 14 — Export System · [14-export-system.md](./14-export-system.md)

**Goal:** Let users save screenshots and export/import the scene as a JSON file.

---

### 14.1 — Create the export utilities

- [ ] Create new file: `src/lib/utils/export.ts`
- [ ] Copy the export code from `14-export-system.md`
- [ ] Implement: `takeScreenshot()`, `exportScene()`, `importScene()`
- [ ] Save the file

---

### 14.2 — Wire screenshot button to the toolbar

- [ ] Open `Toolbar.svelte`
- [ ] Add a camera icon button that calls `takeScreenshot()`
- [ ] `takeScreenshot()` triggers a file download of the canvas as a `.png`
- [ ] Follow the screenshot section in `14-export-system.md`
- [ ] Save the file

---

### 14.3 — Wire scene save/load to the toolbar

- [ ] Open `Toolbar.svelte`
- [ ] Add Save and Load buttons
- [ ] Save — downloads a `.perspx.json` file
- [ ] Load — opens a file picker, reads the JSON, restores the scene
- [ ] Follow the save/load section in `14-export-system.md`
- [ ] Save the file

---

### 14.4 — Create the history store (Undo/Redo)

- [ ] Create new file: `src/lib/stores/history.ts`
- [ ] Copy the history code from `14-export-system.md`
- [ ] This keeps a stack of scene snapshots for Ctrl+Z / Ctrl+Y
- [ ] Save the file

---

### 14.5 — Wire Undo/Redo to keyboard shortcuts

- [ ] Open `src/lib/core/input.ts`
- [ ] Add `Ctrl+Z` — call `history.undo()`
- [ ] Add `Ctrl+Y` or `Ctrl+Shift+Z` — call `history.redo()`
- [ ] Save the file

---

### 14.6 — Run and verify

- [ ] Run: `npm run dev`
- [ ] Add some objects, arrange them
- [ ] Click screenshot button — `.png` file downloads
- [ ] Click Save — `.perspx.json` file downloads
- [ ] Reload the page, click Load — scene is restored exactly
- [ ] `Ctrl+Z` undoes the last action
- [ ] `Ctrl+Y` redoes it

**Phase 14 complete — the app can save and restore work.**

---

---

## Phase 15 — Packaging · [15-packaging.md](./15-packaging.md)

**Goal:** Build PerspX as a native Windows/macOS/Linux app and as a mobile PWA.

---

### 15.1 — Add PWA manifest

- [ ] Create new file: `static/manifest.json`
- [ ] Copy the manifest JSON from `15-packaging.md`
- [ ] Save the file

---

### 15.2 — Add service worker

- [ ] Create new file: `static/sw.js`
- [ ] Copy the service worker code from `15-packaging.md`
- [ ] Save the file

---

### 15.3 — Register PWA in app.html

- [ ] Open `src/app.html`
- [ ] Add the `<link rel="manifest">` and service worker registration script from `15-packaging.md`
- [ ] Save the file

---

### 15.4 — Install Rust (required for Tauri)

- [ ] Go to https://rustup.rs and follow instructions for your OS
- [ ] Run: `rustc --version` to confirm installation
- [ ] Restart your terminal

---

### 15.5 — Initialize Tauri

- [ ] Run: `npx tauri init`
- [ ] Answer the prompts:
  - App name: `PerspX`
  - Window title: `PerspX -- 3D Perspective Tool`
  - Web assets location: `../dist`
  - Dev server URL: `http://localhost:3000`
  - Dev command: `npm run dev`
  - Build command: `npm run build`
- [ ] This creates the `src-tauri/` folder

---

### 15.6 — Configure tauri.conf.json

- [ ] Open `src-tauri/tauri.conf.json`
- [ ] Replace the key settings with the values from `15-packaging.md`
- [ ] Set min window size: 800x600
- [ ] Save the file

---

### 15.7 — Test in Tauri dev mode

- [ ] Run: `npx tauri dev`
- [ ] A **native desktop window** opens with PerspX inside
- [ ] All features work (add objects, move them, etc.)
- [ ] Hot reload still works

---

### 15.8 — Build the desktop installer

- [ ] Run: `npx tauri build`
- [ ] Wait (first build takes 5-10 minutes — Rust is compiling)
- [ ] Find the installer in `src-tauri/target/release/bundle/`
  - Windows: `.msi` file
  - macOS: `.dmg` file
  - Linux: `.AppImage` file
- [ ] Install and run it — PerspX opens as a native app!

---

### 15.9 — Final verification

- [ ] PWA: Open Chrome DevTools — Application tab — Manifest loads correctly
- [ ] PWA: Click "Install" in Chrome's address bar — installs as a standalone app
- [ ] Desktop: Installer works, app opens natively
- [ ] All 3D features work in the native app

**Phase 15 complete — PerspX ships on every platform!**

---

---

## You built PerspX!

```
Phase 1  [ ]  Project Skeleton
Phase 2  [ ]  Three.js Renderer
Phase 3  [ ]  Scene Management
Phase 4  [ ]  Camera Controls
Phase 5  [ ]  Primitives Library
Phase 6  [ ]  Transform Gizmos
Phase 7  [ ]  Grid & Helpers
Phase 8  [ ]  Lighting System
Phase 9  [ ]  Shader / Materials
Phase 10 [ ]  Model Import (glTF)
Phase 11 [ ]  Full UI System
Phase 12 [ ]  Mobile / Responsive
Phase 13 [ ]  Performance Pass
Phase 14 [ ]  Export & Undo/Redo
Phase 15 [ ]  Native App (Tauri)
```

Go back to [00-architecture.md](./00-architecture.md) to review the full system.
