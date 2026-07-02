# 11 — UI System

## Goal
Build the user interface — side panels, toolbar, and viewport overlay — using lightweight vanilla TypeScript and CSS. No heavy UI framework needed.

---

## UI Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  TOOLBAR                                                             │
│  [☰] [📦 Add] [🔀 Transform ▾] [📷 Camera ▾] [💡 Lights ▾] [⚙️]   │
├──────────┬───────────────────────────────────────────┬───────────────┤
│  SCENE   │                                           │  PROPERTIES  │
│  PANEL   │                                           │  PANEL       │
│          │            3D VIEWPORT                     │              │
│  □ Cube1 │                                           │  Transform   │
│  □ Cube2 │                                           │  ─────────── │
│  ● Light │                                           │  X: 0.00     │
│          │                                           │  Y: 0.00     │
│          │                                           │  Z: 0.00     │
│          │                                           │              │
│          │                                           │  Material    │
│          │                                           │  ─────────── │
│          │                                           │  Color: ■    │
│          │                                           │  Rough: ===  │
│          │                                           │              │
├──────────┤                                           ├───────────────┤
│  LIBRARY │                                           │              │
│  🟦 Cube │          [HUD: FOV 50° | 35mm]           │              │
│  🔵 Sph  │                                           │              │
│  🛢️ Cyl  │                                           │              │
└──────────┴───────────────────────────────────────────┴───────────────┘
```

---

## Architecture

Each panel is a standalone class that:
1. Creates its own DOM elements
2. Subscribes to SceneManager/state events
3. Updates reactively when data changes
4. Provides methods to show/hide/toggle

### Base Panel Class

```ts
// src/ui/panel.ts

export abstract class Panel {
  protected container: HTMLElement;
  protected isVisible = true;

  constructor(
    protected parentId: string,
    protected panelId: string,
    protected title: string
  ) {
    this.container = document.createElement('div');
    this.container.id = panelId;
    this.container.className = 'panel';
    this.container.innerHTML = `
      <div class="panel-header">
        <span class="panel-title">${title}</span>
        <button class="panel-collapse" aria-label="Toggle panel">▾</button>
      </div>
      <div class="panel-content"></div>
    `;

    const parent = document.getElementById(parentId);
    if (parent) parent.appendChild(this.container);

    // Collapse toggle
    const collapseBtn = this.container.querySelector('.panel-collapse');
    collapseBtn?.addEventListener('click', () => this.toggleCollapse());
  }

  protected get content(): HTMLElement {
    return this.container.querySelector('.panel-content') as HTMLElement;
  }

  show(): void {
    this.container.style.display = '';
    this.isVisible = true;
  }

  hide(): void {
    this.container.style.display = 'none';
    this.isVisible = false;
  }

  toggle(): void {
    this.isVisible ? this.hide() : this.show();
  }

  private toggleCollapse(): void {
    const content = this.content;
    const btn = this.container.querySelector('.panel-collapse') as HTMLElement;
    if (content.style.display === 'none') {
      content.style.display = '';
      btn.textContent = '▾';
    } else {
      content.style.display = 'none';
      btn.textContent = '▸';
    }
  }

  abstract update(): void;
  abstract dispose(): void;
}
```

---

## Panel Implementations

### Scene Panel (Outliner / Hierarchy)

`src/ui/panels/scene-panel.ts`

```ts
import { Panel } from '../panel';
import type { SceneManager } from '@/core/scene';

export class ScenePanel extends Panel {
  constructor(parentId: string, private sceneManager: SceneManager) {
    super(parentId, 'scene-panel', '🎬 Scene');

    sceneManager.on('object-added', () => this.update());
    sceneManager.on('object-removed', () => this.update());
    sceneManager.on('selection-changed', () => this.updateSelection());

    this.update();
  }

  update(): void {
    const objects = this.sceneManager.getAllObjects();

    this.content.innerHTML = objects
      .map(({ id, meta }) => {
        const icon = meta.type === 'light' ? '💡' : meta.type === 'model' ? '📦' : '🟦';
        const selected = this.sceneManager.isSelected(id) ? 'selected' : '';
        const visibility = meta.visible ? '👁️' : '👁️‍🗨️';

        return `
          <div class="scene-item ${selected}" data-id="${id}">
            <span class="scene-item-icon">${icon}</span>
            <span class="scene-item-name">${meta.name}</span>
            <button class="scene-item-visibility" data-id="${id}">${visibility}</button>
          </div>
        `;
      })
      .join('');

    // Bind click events
    this.content.querySelectorAll('.scene-item').forEach((el) => {
      el.addEventListener('click', (e) => {
        const id = (el as HTMLElement).dataset.id!;
        const additive = (e as MouseEvent).shiftKey;
        this.sceneManager.select(id, additive);
      });
    });

    // Bind visibility toggles
    this.content.querySelectorAll('.scene-item-visibility').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.id!;
        const obj = this.sceneManager.getObject(id);
        const meta = this.sceneManager.getMeta(id);
        if (obj && meta) {
          obj.visible = !obj.visible;
          meta.visible = obj.visible;
          this.update();
        }
      });
    });
  }

  private updateSelection(): void {
    this.content.querySelectorAll('.scene-item').forEach((el) => {
      const id = (el as HTMLElement).dataset.id!;
      el.classList.toggle('selected', this.sceneManager.isSelected(id));
    });
  }

  dispose(): void {
    this.container.remove();
  }
}
```

### Properties Panel

`src/ui/panels/properties-panel.ts`

```ts
import { Panel } from '../panel';
import type { SceneManager } from '@/core/scene';
import { Mesh, Vector3, Euler, MathUtils } from 'three';

export class PropertiesPanel extends Panel {
  private selectedId: string | null = null;

  constructor(parentId: string, private sceneManager: SceneManager) {
    super(parentId, 'properties-panel', '⚙️ Properties');

    sceneManager.on('selection-changed', (data) => {
      this.selectedId = data.selectedIds.length === 1 ? data.selectedIds[0] : null;
      this.update();
    });

    this.update();
  }

  update(): void {
    if (!this.selectedId) {
      this.content.innerHTML = '<p class="panel-empty">Select an object</p>';
      return;
    }

    const obj = this.sceneManager.getObject(this.selectedId);
    const meta = this.sceneManager.getMeta(this.selectedId);
    if (!obj || !meta) return;

    const pos = obj.position;
    const rot = obj.rotation;
    const scale = obj.scale;

    this.content.innerHTML = `
      <div class="prop-section">
        <div class="prop-section-title">📐 Transform</div>
        <div class="prop-row">
          <label>Position</label>
          <div class="prop-xyz">
            <input type="number" step="0.1" value="${pos.x.toFixed(2)}" data-prop="px" class="prop-input x" />
            <input type="number" step="0.1" value="${pos.y.toFixed(2)}" data-prop="py" class="prop-input y" />
            <input type="number" step="0.1" value="${pos.z.toFixed(2)}" data-prop="pz" class="prop-input z" />
          </div>
        </div>
        <div class="prop-row">
          <label>Rotation (°)</label>
          <div class="prop-xyz">
            <input type="number" step="1" value="${MathUtils.radToDeg(rot.x).toFixed(0)}" data-prop="rx" class="prop-input x" />
            <input type="number" step="1" value="${MathUtils.radToDeg(rot.y).toFixed(0)}" data-prop="ry" class="prop-input y" />
            <input type="number" step="1" value="${MathUtils.radToDeg(rot.z).toFixed(0)}" data-prop="rz" class="prop-input z" />
          </div>
        </div>
        <div class="prop-row">
          <label>Scale</label>
          <div class="prop-xyz">
            <input type="number" step="0.1" value="${scale.x.toFixed(2)}" data-prop="sx" class="prop-input" />
            <input type="number" step="0.1" value="${scale.y.toFixed(2)}" data-prop="sy" class="prop-input" />
            <input type="number" step="0.1" value="${scale.z.toFixed(2)}" data-prop="sz" class="prop-input" />
          </div>
        </div>
      </div>

      <div class="prop-section">
        <div class="prop-section-title">🎨 Object</div>
        <div class="prop-row">
          <label>Name</label>
          <input type="text" value="${meta.name}" data-prop="name" class="prop-input full" />
        </div>
        <div class="prop-row">
          <label>Locked</label>
          <input type="checkbox" ${meta.locked ? 'checked' : ''} data-prop="locked" />
        </div>
      </div>
    `;

    // Bind inputs
    this.content.querySelectorAll('.prop-input').forEach((input) => {
      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const prop = target.dataset.prop!;
        this.onPropertyChange(prop, target.value);
      });
    });

    // Bind checkbox
    this.content.querySelector('[data-prop="locked"]')?.addEventListener('change', (e) => {
      meta.locked = (e.target as HTMLInputElement).checked;
    });
  }

  private onPropertyChange(prop: string, value: string): void {
    if (!this.selectedId) return;
    const obj = this.sceneManager.getObject(this.selectedId);
    if (!obj) return;

    const num = parseFloat(value);

    switch (prop) {
      case 'px': obj.position.x = num; break;
      case 'py': obj.position.y = num; break;
      case 'pz': obj.position.z = num; break;
      case 'rx': obj.rotation.x = MathUtils.degToRad(num); break;
      case 'ry': obj.rotation.y = MathUtils.degToRad(num); break;
      case 'rz': obj.rotation.z = MathUtils.degToRad(num); break;
      case 'sx': obj.scale.x = num; break;
      case 'sy': obj.scale.y = num; break;
      case 'sz': obj.scale.z = num; break;
      case 'name':
        const meta = this.sceneManager.getMeta(this.selectedId);
        if (meta) meta.name = value;
        break;
    }
  }

  dispose(): void {
    this.container.remove();
  }
}
```

### Library Panel (Primitives List)

`src/ui/panels/library-panel.ts`

```ts
import { Panel } from '../panel';
import { getPrimitiveList, createPrimitive, type PrimitiveType } from '@/objects/primitives';
import type { SceneManager } from '@/core/scene';

export class LibraryPanel extends Panel {
  constructor(parentId: string, private sceneManager: SceneManager) {
    super(parentId, 'library-panel', '📦 Library');
    this.update();
  }

  update(): void {
    const primitives = getPrimitiveList();

    this.content.innerHTML = `
      <div class="library-grid">
        ${primitives
          .map(
            (p) => `
          <button class="library-item" data-type="${p.type}" title="Add ${p.label}">
            <span class="library-icon">${p.icon}</span>
            <span class="library-label">${p.label}</span>
          </button>
        `
          )
          .join('')}
      </div>
      <div class="library-divider"></div>
      <button class="library-import-btn" id="import-model-btn">
        📁 Import Model...
      </button>
    `;

    // Bind primitive buttons
    this.content.querySelectorAll('.library-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = (btn as HTMLElement).dataset.type as PrimitiveType;
        const mesh = createPrimitive(type);
        const id = this.sceneManager.addObject(mesh, 'primitive', type.charAt(0).toUpperCase() + type.slice(1));
        this.sceneManager.select(id);
      });
    });
  }

  dispose(): void {
    this.container.remove();
  }
}
```

### Viewport Overlay (HUD)

`src/ui/viewport-overlay.ts`

```ts
import type { CameraController } from '@/camera/camera-controller';
import type { DollyZoom } from '@/camera/dolly-zoom';

export class ViewportOverlay {
  private element: HTMLElement;

  constructor(
    private cameraController: CameraController,
    private dollyZoom?: DollyZoom
  ) {
    this.element = document.createElement('div');
    this.element.id = 'viewport-overlay';
    this.element.className = 'viewport-overlay';
    document.getElementById('app')?.appendChild(this.element);
  }

  update(): void {
    const mode = this.cameraController.mode;
    const fov = this.cameraController.getFOV();
    const focalLength = (36 / 2) / Math.tan((fov * Math.PI) / 360);

    let html = `
      <div class="hud-item">${mode === 'perspective' ? '🔭 Perspective' : '📐 Orthographic'}</div>
      <div class="hud-item">FOV: ${fov.toFixed(0)}°</div>
      <div class="hud-item">~${focalLength.toFixed(0)}mm</div>
    `;

    if (this.dollyZoom?.active) {
      const info = this.dollyZoom.getInfo();
      html += `<div class="hud-item hud-active">🎬 Dolly Zoom | Dist: ${info.distance.toFixed(1)}</div>`;
    }

    this.element.innerHTML = html;
  }

  dispose(): void {
    this.element.remove();
  }
}
```

---

## Styles

`src/styles/ui.css` (included in `main.css`):

```css
/* --- Panels --- */
.panel {
  background: rgba(20, 20, 30, 0.92);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  overflow: hidden;
  font-size: 13px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  user-select: none;
}

.panel-title {
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #ccc;
}

.panel-content {
  padding: 8px;
  max-height: 400px;
  overflow-y: auto;
}

/* --- Scene Items --- */
.scene-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}
.scene-item:hover { background: rgba(255, 255, 255, 0.06); }
.scene-item.selected { background: rgba(74, 158, 255, 0.2); border: 1px solid rgba(74, 158, 255, 0.4); }

/* --- Properties --- */
.prop-section { margin-bottom: 12px; }
.prop-section-title { font-size: 11px; font-weight: 600; color: #888; margin-bottom: 6px; text-transform: uppercase; }
.prop-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.prop-row label { font-size: 12px; color: #999; min-width: 60px; }
.prop-xyz { display: flex; gap: 4px; flex: 1; }
.prop-input {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: #e0e0e0;
  padding: 4px 6px;
  font-size: 12px;
  width: 100%;
  font-family: 'JetBrains Mono', monospace;
}
.prop-input:focus { border-color: #4a9eff; outline: none; }
.prop-input.x { border-left: 2px solid #ff4444; }
.prop-input.y { border-left: 2px solid #44ff44; }
.prop-input.z { border-left: 2px solid #4444ff; }

/* --- Library --- */
.library-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; }
.library-item {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 4px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 6px; cursor: pointer; color: #ccc; font-size: 11px; transition: all 0.15s;
}
.library-item:hover { background: rgba(74,158,255,0.1); border-color: rgba(74,158,255,0.3); }
.library-icon { font-size: 22px; }

/* --- Viewport Overlay / HUD --- */
.viewport-overlay {
  position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 12px; padding: 6px 16px;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
  border-radius: 20px; border: 1px solid rgba(255,255,255,0.08);
  font-size: 12px; color: #aaa; user-select: none;
}
.hud-active { color: #ffaa00; font-weight: 600; }
```

---

## Verification

- Scene panel lists all objects with correct icons
- Clicking a scene item selects the object in viewport
- Properties panel shows transform values for selected object
- Editing position/rotation/scale inputs updates the object live
- Library panel shows all 10 primitives
- Clicking a primitive adds it to the scene
- HUD shows current camera mode, FOV, and focal length
- Panels are collapsible
- Dark glassmorphism theme looks cohesive

---

## Output

After this phase, you have:
- [x] Scene hierarchy panel with selection and visibility toggle
- [x] Properties panel with live transform editing
- [x] Library panel with primitives grid
- [x] Viewport HUD overlay (FOV, focal length, mode)
- [x] Base panel class for consistent UI patterns
- [x] Glassmorphism dark theme CSS
- [x] Collapsible panels

---

## Next → [12-responsive-design.md](./12-responsive-design.md)
