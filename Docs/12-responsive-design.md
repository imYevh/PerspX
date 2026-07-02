# 12 — Responsive Design

## Goal
Make PerspX work seamlessly on both desktop (large screens) and mobile devices (phones, tablets). The UI should adapt its layout, and touch interactions should feel native.

---

## Breakpoints

| Breakpoint   | Width        | Layout                              |
| :----------- | :----------- | :---------------------------------- |
| **Desktop**  | ≥ 1024px     | 3-column: Left Panel | Viewport | Right Panel |
| **Tablet**   | 768–1023px   | Collapsible side panels, overlay mode |
| **Mobile**   | < 768px      | Full-screen viewport, bottom sheet panels |

---

## Layout Strategy

### Desktop (≥ 1024px)

```
┌──────────┬───────────────────────┬──────────┐
│  Scene   │                       │ Props    │
│  Panel   │      3D Viewport      │ Panel    │
│          │                       │          │
│  Library │                       │          │
│  Panel   │        [HUD]          │          │
└──────────┴───────────────────────┴──────────┘
```

### Mobile (< 768px)

```
┌─────────────────────────────────────────────┐
│ [☰] [📦] [🔀] [📷] [💡]     ← Top bar     │
├─────────────────────────────────────────────┤
│                                             │
│              3D Viewport                    │
│             (full screen)                   │
│                                             │
│                [HUD]                        │
├─────────────────────────────────────────────┤
│  ▂▂ Bottom Sheet (drag up)                  │
│  Scene | Library | Properties               │
│  ─────────────────────────────              │
│  (tab content here)                         │
└─────────────────────────────────────────────┘
```

---

## Implementation

### `src/ui/responsive.ts`

```ts
export type ScreenSize = 'mobile' | 'tablet' | 'desktop';

export class ResponsiveManager {
  private currentSize: ScreenSize = 'desktop';
  private listeners: Array<(size: ScreenSize) => void> = [];
  private resizeObserver: ResizeObserver;

  constructor() {
    this.currentSize = this.getScreenSize();
    this.resizeObserver = new ResizeObserver(() => {
      const newSize = this.getScreenSize();
      if (newSize !== this.currentSize) {
        this.currentSize = newSize;
        this.notify();
      }
    });
    this.resizeObserver.observe(document.body);
  }

  getScreenSize(): ScreenSize {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  get size(): ScreenSize {
    return this.currentSize;
  }

  get isMobile(): boolean {
    return this.currentSize === 'mobile';
  }

  get isDesktop(): boolean {
    return this.currentSize === 'desktop';
  }

  onChange(callback: (size: ScreenSize) => void): void {
    this.listeners.push(callback);
  }

  private notify(): void {
    for (const cb of this.listeners) cb(this.currentSize);
  }

  dispose(): void {
    this.resizeObserver.disconnect();
  }
}
```

### `src/ui/bottom-sheet.ts` (Mobile Panel Container)

```ts
/**
 * A draggable bottom sheet for mobile that contains
 * tabbed panels (Scene, Library, Properties)
 */
export class BottomSheet {
  private element: HTMLElement;
  private content: HTMLElement;
  private handle: HTMLElement;
  private isDragging = false;
  private startY = 0;
  private currentHeight = 200;
  private minHeight = 60;    // Just the tabs visible
  private maxHeight = 0;
  private activeTab = 'library';

  private tabs = [
    { id: 'scene', label: '🎬 Scene' },
    { id: 'library', label: '📦 Library' },
    { id: 'properties', label: '⚙️ Props' },
  ];

  constructor() {
    this.maxHeight = window.innerHeight * 0.7;

    this.element = document.createElement('div');
    this.element.id = 'bottom-sheet';
    this.element.className = 'bottom-sheet';

    this.element.innerHTML = `
      <div class="bottom-sheet-handle">
        <div class="bottom-sheet-handle-bar"></div>
      </div>
      <div class="bottom-sheet-tabs">
        ${this.tabs.map((t) => `
          <button class="bottom-sheet-tab ${t.id === this.activeTab ? 'active' : ''}"
                  data-tab="${t.id}">${t.label}</button>
        `).join('')}
      </div>
      <div class="bottom-sheet-content"></div>
    `;

    this.handle = this.element.querySelector('.bottom-sheet-handle')!;
    this.content = this.element.querySelector('.bottom-sheet-content')!;

    document.getElementById('app')?.appendChild(this.element);

    this.element.style.height = `${this.currentHeight}px`;

    this.bindEvents();
  }

  private bindEvents(): void {
    // Drag handle
    this.handle.addEventListener('touchstart', (e) => {
      this.isDragging = true;
      this.startY = e.touches[0].clientY;
    });

    document.addEventListener('touchmove', (e) => {
      if (!this.isDragging) return;
      const dy = this.startY - e.touches[0].clientY;
      this.currentHeight = Math.max(this.minHeight, Math.min(this.maxHeight, this.currentHeight + dy));
      this.element.style.height = `${this.currentHeight}px`;
      this.startY = e.touches[0].clientY;
    });

    document.addEventListener('touchend', () => {
      this.isDragging = false;
      // Snap to positions
      if (this.currentHeight < 100) {
        this.currentHeight = this.minHeight;
      } else if (this.currentHeight > this.maxHeight * 0.8) {
        this.currentHeight = this.maxHeight;
      }
      this.element.style.height = `${this.currentHeight}px`;
      this.element.style.transition = 'height 0.2s ease';
      setTimeout(() => this.element.style.transition = '', 200);
    });

    // Tab switching
    this.element.querySelectorAll('.bottom-sheet-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tabId = (btn as HTMLElement).dataset.tab!;
        this.setActiveTab(tabId);
      });
    });
  }

  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
    this.element.querySelectorAll('.bottom-sheet-tab').forEach((btn) => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === tabId);
    });
    // Panels will mount/unmount their content based on active tab
  }

  getContentElement(): HTMLElement {
    return this.content;
  }

  expand(): void {
    this.currentHeight = this.maxHeight * 0.5;
    this.element.style.height = `${this.currentHeight}px`;
  }

  collapse(): void {
    this.currentHeight = this.minHeight;
    this.element.style.height = `${this.currentHeight}px`;
  }

  dispose(): void {
    this.element.remove();
  }
}
```

### Mobile CSS

```css
/* --- Responsive Layout --- */

/* Desktop: 3-column */
@media (min-width: 1024px) {
  #app {
    display: grid;
    grid-template-columns: 240px 1fr 260px;
    grid-template-rows: 48px 1fr;
    grid-template-areas:
      "toolbar toolbar toolbar"
      "left    viewport right";
  }
  #left-panels { grid-area: left; overflow-y: auto; }
  #viewport { grid-area: viewport; }
  #right-panels { grid-area: right; overflow-y: auto; }
  .bottom-sheet { display: none; }
}

/* Tablet: overlay panels */
@media (min-width: 768px) and (max-width: 1023px) {
  #app {
    display: grid;
    grid-template-rows: 48px 1fr;
    grid-template-areas: "toolbar" "viewport";
  }
  #left-panels, #right-panels {
    position: absolute;
    top: 48px;
    width: 260px;
    height: calc(100% - 48px);
    z-index: 10;
    transition: transform 0.3s ease;
  }
  #left-panels { left: 0; transform: translateX(-100%); }
  #left-panels.open { transform: translateX(0); }
  #right-panels { right: 0; transform: translateX(100%); }
  #right-panels.open { transform: translateX(0); }
  .bottom-sheet { display: none; }
}

/* Mobile: full viewport + bottom sheet */
@media (max-width: 767px) {
  #app {
    display: flex;
    flex-direction: column;
  }
  #left-panels, #right-panels { display: none; }
  #viewport { flex: 1; }

  .bottom-sheet {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    background: rgba(15, 15, 25, 0.95);
    backdrop-filter: blur(16px);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px 16px 0 0;
    z-index: 100;
  }
  .bottom-sheet-handle {
    padding: 8px;
    display: flex;
    justify-content: center;
  }
  .bottom-sheet-handle-bar {
    width: 36px;
    height: 4px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 2px;
  }
  .bottom-sheet-tabs {
    display: flex;
    gap: 4px;
    padding: 0 8px 8px;
  }
  .bottom-sheet-tab {
    flex: 1;
    padding: 8px;
    font-size: 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    color: #888;
    cursor: pointer;
  }
  .bottom-sheet-tab.active {
    background: rgba(74, 158, 255, 0.15);
    border-color: rgba(74, 158, 255, 0.3);
    color: #fff;
  }
  .bottom-sheet-content {
    padding: 8px;
    overflow-y: auto;
  }

  /* Mobile toolbar adjustments */
  .toolbar {
    padding: 4px 8px;
    gap: 4px;
  }
  .toolbar button {
    padding: 8px;
    font-size: 18px;
  }
}

/* Touch-friendly sizing */
@media (pointer: coarse) {
  .scene-item { padding: 10px 8px; }
  .library-item { padding: 14px 4px; }
  .prop-input { padding: 8px; font-size: 14px; }
  button { min-height: 44px; min-width: 44px; }
}
```

---

## Touch Gestures Summary

| Gesture          | Viewport Action     | Panel Action           |
| :--------------- | :------------------ | :--------------------- |
| 1-finger drag    | Orbit camera        | Scroll panel content   |
| 2-finger pinch   | Zoom                | —                      |
| 2-finger drag    | Pan camera          | —                      |
| Tap              | Select object       | Tap button/item        |
| Long-press       | Context menu (*)    | —                      |
| Swipe up sheet   | —                   | Expand bottom sheet    |
| Swipe down sheet | —                   | Collapse bottom sheet  |

(*) Context menu is a future enhancement.

---

## Verification

- Desktop (≥1024px): 3-column layout with fixed side panels
- Tablet (768-1023px): Panels slide in as overlays
- Mobile (<768px): Full-screen viewport with bottom sheet
- Bottom sheet is draggable and snaps to min/mid/max heights
- Tab switching in bottom sheet works correctly
- Touch targets are ≥44px on mobile (Apple HIG / Material guidelines)
- All camera controls work with touch input
- No accidental browser gestures (pull-to-refresh, swipe back)

---

## Output

After this phase, you have:
- [x] 3 responsive breakpoints (desktop, tablet, mobile)
- [x] CSS Grid layout with named areas
- [x] Sliding overlay panels for tablet
- [x] Draggable bottom sheet with tabs for mobile
- [x] Touch-friendly sizing for all interactive elements
- [x] `ResponsiveManager` for programmatic layout queries
- [x] `touch-action: none` to prevent browser gesture conflicts

---

## Next → [13-performance.md](./13-performance.md)
