# 00 — Architecture & Tech Stack

## Project Name: **PerspX**

A cross-platform 3D perspective visualization and study tool for artists — inspired by Zolly, built for extensibility.

---

## Tech Stack Decision

| Layer              | Technology                        | Rationale                                                                 |
| :----------------- | :-------------------------------- | :------------------------------------------------------------------------ |
| **Language**       | TypeScript                        | Type safety, productivity, huge ecosystem                                 |
| **3D Engine**      | Three.js (WebGPURenderer)         | Production-ready WebGPU with automatic WebGL2 fallback; massive ecosystem |
| **Shader System**  | TSL (Three Shader Language)       | Write shaders in JS/TS that compile to both WGSL and GLSL automatically  |
| **Build Tool**     | Vite (via SvelteKit)              | Lightning-fast HMR, native TS support, tiny bundles                       |
| **UI Framework**   | SvelteKit (SPA mode)              | Compiled reactivity, scoped styles, tiny runtime, component-based UI      |
| **Desktop App**    | Tauri 2                           | Tiny binary (~5 MB), native performance, Rust backend, iOS/Android ready  |
| **Mobile App**     | Tauri 2 (iOS/Android) + PWA       | Single codebase; PWA as fallback for instant mobile access                |
| **State Mgmt**     | Svelte stores + EventEmitter      | Svelte stores for UI state; EventEmitter for engine ↔ UI bridge           |
| **Model Format**   | glTF 2.0 (.glb)                   | Industry standard, compact, supports PBR materials                        |

### Why This Stack?

- **Not OpenGL**: WebGPU is the modern successor. Three.js `WebGPURenderer` abstracts it cleanly with automatic WebGL2 fallback for older devices.
- **Cross-Platform**: Web app runs everywhere. Tauri 2 wraps it into native desktop + mobile apps with ~5 MB overhead (vs. Electron's ~150 MB).
- **Lightweight**: No game engine bloat. Three.js + SvelteKit produces bundles under 1 MB (gzipped) for the core renderer.
- **Productive**: TypeScript + SvelteKit + Three.js has the fastest iteration loop of any 3D stack.
- **Compiled Reactivity**: Svelte compiles components into minimal vanilla JS at build time — no virtual DOM diffing overhead, critical for maintaining 60 FPS alongside a 3D render loop.
- **Extensible**: Three.js's scene graph, material system, and plugin architecture make it trivial to add shaders, lights, post-processing, and custom models.

### Alternatives Considered

| Option         | Rejected Because                                                      |
| :------------- | :-------------------------------------------------------------------- |
| React / Vue    | Virtual DOM overhead in a 60fps 3D app; heavier runtime               |
| Babylon.js     | Heavier, more opinionated; better for full game engines               |
| Bevy (Rust)    | Excellent but steep learning curve; slower iteration for UI-heavy app |
| Godot          | Full game engine — overkill for a focused tool app                    |
| Raw WebGPU     | Too low-level; would reimplement what Three.js already provides       |
| OpenGL / WebGL | Explicitly excluded; legacy API                                       |

---

## Project Structure

```
PerspX/
├── Docs/                        # Feature documentation (you are here)
│   ├── 00-architecture.md
│   ├── 01-project-setup.md
│   ├── ...
│   └── 15-packaging.md
│
├── src/
│   ├── app.html                 # SvelteKit HTML shell
│   ├── app.css                  # Global styles (reset, fonts, variables)
│   │
│   ├── routes/                  # SvelteKit pages (SPA — single route)
│   │   ├── +layout.svelte       # Root layout (app shell, toolbar, panel containers)
│   │   └── +page.svelte         # Main page (3D viewport + panels)
│   │
│   └── lib/                     # Importable modules ($lib alias)
│       ├── components/          # Svelte UI components
│       │   ├── Toolbar.svelte
│       │   ├── ViewportOverlay.svelte
│       │   ├── BottomSheet.svelte
│       │   └── panels/
│       │       ├── Panel.svelte          # Reusable collapsible panel (slot-based)
│       │       ├── ScenePanel.svelte     # Scene hierarchy / outliner
│       │       ├── PropertiesPanel.svelte # Selected object properties
│       │       ├── CameraPanel.svelte    # Camera settings
│       │       └── LibraryPanel.svelte   # Primitives / models library
│       │
│       ├── stores/              # Svelte stores (reactive state)
│       │   ├── scene.ts         # Scene objects & selection state
│       │   ├── camera.ts        # Camera mode, FOV, presets
│       │   ├── ui.ts            # Panel visibility, responsive breakpoint
│       │   └── history.ts       # Undo / redo stack
│       │
│       ├── core/                # Engine core (pure TS — no Svelte)
│       │   ├── renderer.ts      # WebGPU renderer setup
│       │   ├── scene.ts         # Scene management
│       │   ├── loop.ts          # Render loop / animation frame
│       │   └── input.ts         # Unified input (mouse, touch, keyboard)
│       │
│       ├── camera/              # Camera system (pure TS)
│       │   ├── camera-controller.ts # Orbit, pan, zoom controls
│       │   ├── camera-presets.ts    # Perspective, ortho, dolly-zoom
│       │   └── dolly-zoom.ts       # Dolly zoom (Vertigo) effect
│       │
│       ├── objects/             # Scene objects (pure TS)
│       │   ├── primitives.ts    # Cube, sphere, cylinder, cone, torus, plane
│       │   ├── object-manager.ts # Add, remove, select objects
│       │   └── model-loader.ts  # glTF/OBJ/FBX import
│       │
│       ├── transforms/          # Object manipulation (pure TS)
│       │   ├── transform-controls.ts # Move, rotate, scale gizmos
│       │   └── snapping.ts      # Grid snapping, angle snapping
│       │
│       ├── lighting/            # Lighting system (pure TS)
│       │   ├── light-manager.ts # Add/remove/configure lights
│       │   └── light-presets.ts # Studio, outdoor, dramatic presets
│       │
│       ├── materials/           # Shaders & materials (pure TS)
│       │   ├── material-system.ts # Material management
│       │   ├── shader-library.ts  # Built-in TSL shaders
│       │   └── wireframe.ts     # Wireframe / edge overlay
│       │
│       ├── helpers/             # Drawing aids (pure TS)
│       │   ├── grid.ts          # Infinite grid
│       │   ├── axes.ts          # XYZ axes indicator
│       │   ├── ground-plane.ts  # Ground plane with shadow
│       │   └── vanishing-points.ts # Vanishing point visualization
│       │
│       └── utils/               # Utilities (pure TS)
│           ├── math.ts          # Math helpers
│           ├── export.ts        # Screenshot / scene export
│           └── constants.ts     # App-wide constants
│
├── static/                      # Static assets (SvelteKit convention)
│   ├── models/                  # Built-in 3D models (.glb)
│   └── textures/                # Built-in textures
│
├── svelte.config.js             # SvelteKit configuration (adapter-static)
├── vite.config.ts               # Vite configuration (sveltekit plugin)
├── tsconfig.json                # TypeScript configuration
├── package.json
└── src-tauri/                   # Tauri backend (Rust) — for desktop/mobile builds
    ├── src/
    │   └── main.rs
    ├── Cargo.toml
    └── tauri.conf.json
```

---

## Design Principles

1. **Modular Architecture**: Every system (camera, lighting, materials, objects) is an independent module with a clean API. Systems communicate through the state store and events — never by direct coupling.

2. **Renderer Agnostic Core Logic**: Business logic (scene graph, object management, undo/redo) never directly touches the renderer. This makes it possible to swap renderers or run headless tests.

3. **Mobile-First Input**: The input system handles touch and mouse identically. Every interaction works on both platforms from day one.

4. **Progressive Enhancement**: The app starts as a web app. Tauri wraps it for native desktop and mobile without changing the core code.

5. **Performance Budget**: Target 60 FPS on mid-range mobile devices with 100+ objects in the scene. Use instancing, LOD, and frustum culling from the beginning.

---

## Build Order (Feature Phases)

The docs are organized in build order. Each phase builds on the previous one:

| Phase | Doc                          | Deliverable                          |
| :---- | :--------------------------- | :----------------------------------- |
| 1     | `01-project-setup`           | Vite + TS + Three.js scaffolding     |
| 2     | `02-core-renderer`           | WebGPU canvas with render loop       |
| 3     | `03-scene-management`        | Scene graph, object lifecycle        |
| 4     | `04-camera-system`           | Orbit controls, perspective switch   |
| 5     | `05-primitives-library`      | Add primitives from a list           |
| 6     | `06-transform-controls`      | Move/rotate/scale gizmos             |
| 7     | `07-grid-and-helpers`        | Grid, axes, ground plane             |
| 8     | `08-lighting-system`         | Dynamic lights                       |
| 9     | `09-shader-system`           | Custom materials with TSL            |
| 10    | `10-model-import`            | Load glTF/OBJ models                 |
| 11    | `11-ui-system`               | Panels, toolbar, hierarchy           |
| 12    | `12-responsive-design`       | Mobile layout and touch              |
| 13    | `13-performance`             | Optimization pass                    |
| 14    | `14-export-system`           | Screenshots, scene save/load         |
| 15    | `15-packaging`               | Tauri desktop + mobile builds        |
