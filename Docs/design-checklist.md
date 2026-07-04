# PerspX — UI/UX Wireframe & Design Checklist

This document details all the views, layouts, interactive components, controls, and states required to design and wireframe the **PerspX** 3D perspective visualization tool. Use this as a checklist for your design system, Figma layouts, or hand-drawn wireframes.

---

## 1. Application Layouts (Responsive Breakpoints)

You need to wireframe/design the application shell for three primary breakpoints:

### [ ] Desktop Layout (Width ≥ 1024px)
- **Grid Structure**: 3-Column Layout.
  - **Left Sidebar** (240px wide): Houses the *Scene Panel* (top) and *Library Panel* (bottom).
  - **Center Viewport**: Full-height WebGL/WebGPU 3D canvas.
  - **Right Sidebar** (260px wide): Houses the *Properties Panel* (contextual to the selected object).
- **Top Toolbar**: Full-width persistent bar (48px height) for quick actions.
- **HUD (Viewport Overlay)**: Floating capsule at the bottom center of the viewport.

### [ ] Tablet Layout (768px – 1023px)
- **Grid Structure**: 2-column or full viewport.
- **Collapsible Drawers**: Left and right sidebars slide in/out over the 3D viewport.
- **Drawer Toggles**: Buttons on the toolbar or edges to slide drawers in/out.

### [ ] Mobile Layout (Width < 768px)
- **Top Bar**: Extremely compact (48px height) holding only the main menu, quick add, transform mode select, and lights preset button.
- **Full-Screen Viewport**: The 3D canvas fills the entire screen under the Top Bar.
- **Draggable Bottom Sheet**: Draggable container starting at the bottom with three drag states:
  1. *Collapsed* (~60px height): Only the panel tabs are visible.
  2. *Half-Expanded* (~50% height): Shows a portion of the active panel content.
  3. *Fully-Expanded* (~70%-80% height): Shows full panel content with scroll.
- **Tab Bar inside Bottom Sheet**: Icons/labels for **Scene**, **Library**, and **Props**.

---

## 2. Global Navigation & Toolbar (Top Bar)

The toolbar acts as the control center of the application. Wireframe it with the following buttons and dropdowns:

### [ ] Top Toolbar Area
- [ ] **Main Menu Button (☰)**: Dropdown containing file/application actions:
  - *New Scene*, *About PerspX*, *Keyboard Shortcuts Guide*, *Settings*.
- [ ] **Add Object Dropdown (📦)**: Quick list to add basic 3D shapes:
  - *Cube, Sphere, Cylinder, Cone, Torus, Plane, Light Source, glTF Model Import*.
- [ ] **Transform Mode Selector (🔀)**: A toggle group (segment control) for manipulation modes:
  - *Select (Default)*, *Translate (Move)*, *Rotate*, *Scale*.
  - *Snapping Toggle*: Active state button to enable/disable grid/angle snapping.
- [ ] **Camera Controls Dropdown (📷)**:
  - *Projection Toggle*: Switch between **Perspective** and **Orthographic**.
  - *Focal Presets*: Front, Top, Side, isometric, or three-quarter views.
  - *Dolly Zoom Toggle*: Turn on/off the signature dolly zoom mode.
- [ ] **Lighting Presets Dropdown (💡)**:
  - Presets: *Studio*, *Outdoor*, *Dramatic*, *Custom*.
- [ ] **History Controls**:
  - *Undo (↺)* and *Redo (↻)* buttons (disable/enable state based on history stack).
- [ ] **Utility Buttons**:
  - *Screenshot Icon (📷)*: Triggers high-res canvas render download.
  - *Save Icon (💾)*: Downloads current scene as `.perspx.json`.
  - *Load Icon (📁)*: Launches file dialog to import `.perspx.json`.
  - *App Settings (⚙️)*: Toggles global configuration modal.

---

## 3. Sidebar Panels (Desktop/Tablet) & Bottom Sheet (Mobile)

All side panels must support a collapsible state. Design the individual sub-components:

### [ ] Panel Wrapper (Base Component)
- [ ] **Panel Header**: Title, icon, and a toggle chevron (▾/▸) to collapse/expand panel contents.
- [ ] **Scrollable Content Container**: For scrollable list interfaces.

### [ ] Scene Panel (Outliner / Hierarchy)
- [ ] **Empty State**: Prompt indicating the scene is empty.
- [ ] **Object List Item**: Row representing a scene object containing:
  - *Type Icon*: e.g., 🟦 for primitive, 📦 for imported mesh, 💡 for light source.
  - *Object Name*: Editable text label.
  - *Visibility Toggle*: Eye icon (👁️ for visible, 👁️‍🗨️ or diagonal slash for hidden).
  - *Selected State*: Highlighted background with a blue accent border.

### [ ] Library Panel (Mesh / Object Library)
- [ ] **Primitive Shapes Grid**: A 2x2 or 2x3 grid of buttons representing built-in shapes:
  - *Box (Cube), Sphere, Cylinder, Cone, Torus, Plane*.
  - Each item contains a 2D stylized icon and a label (e.g., "Box").
- [ ] **Import Model Button**: A wide, high-contrast button labeled "📁 Import Model..." to load custom `.glb` / `.gltf` assets.

### [ ] Properties Panel (Contextual)
- [ ] **Unselected State**: Text saying "Select an object to view properties".
- [ ] **Transform Controls Section**:
  - *Position Inputs*: Vector fields for X, Y, Z. Design them with color-coded side indicators (Red for X, Green for Y, Blue for Z).
  - *Rotation Inputs*: Vector fields in degrees (X, Y, Z) with matching color-coding.
  - *Scale Inputs*: Vector fields (X, Y, Z) with matching color-coding.
- [ ] **Object Metadata Section**:
  - *Object Name Input*: Text box to rename the selected object.
  - *Locked Checkbox/Toggle*: Prevents the object from being moved, scaled, or rotated via gizmos.
- [ ] **Material & Shader Section**:
  - *Shader Library Dropdown*: Options like *Clay (Default Matte)*, *Wireframe*, *Outline/Cel*, *Metallic*, *Grid Material*.
  - *Color Picker*: Interactive color swatch box indicating current color.
  - *Roughness Slider*: Slider from 0.0 (reflective) to 1.0 (rough matte).
  - *Metalness Slider*: Slider from 0.0 (non-metal) to 1.0 (metal).

---

## 4. Viewport Visual Elements & HUD

The 3D Viewport needs design overlays for canvas-rendered helpers and HUD (Heads-Up Display) components.

### [ ] HUD Viewport Overlay
- [ ] **Location**: Positioned floating at the bottom center of the viewport.
- [ ] **Design Style**: Glassmorphic capsule (dark background, transparent blur, fine white border).
- [ ] **Displays**:
  - *Camera Projection Mode*: e.g., "🔭 Perspective" or "📐 Orthographic".
  - *FOV (Field of View)*: e.g., "FOV: 50°".
  - *Focal Length*: Calculated equivalent, e.g., "~35mm".
  - *Dolly Zoom Indicator*: High-contrast/yellow alert text appearing only when Dolly Zoom is actively enabled (e.g., "🎬 Dolly Zoom | Dist: 12.3").

### [ ] 3D Transformation Gizmos (WebGL/Canvas Overlay)
You need to visualize how the 3D handles look when an object is selected.
- [ ] **Translate (Move) Gizmo**: 3 directional arrows meeting at a center handle.
  - *X-Axis*: Red arrow.
  - *Y-Axis*: Green arrow.
  - *Z-Axis*: Blue arrow.
- [ ] **Rotate Gizmo**: 3 intersecting thin rings.
  - *Pitch (X)*: Red ring.
  - *Yaw (Y)*: Green ring.
  - *Roll (Z)*: Blue ring.
  - *Screen Space Roll*: Outer grey ring.
- [ ] **Scale Gizmo**: 3 line handles capped with box shapes.
  - *X Scale*: Red box line.
  - *Y Scale*: Green box line.
  - *Z Scale*: Blue box line.

### [ ] Canvas Helpers & Drawing Aids
- [ ] **Infinite Ground Grid**: Grid lines converging to the horizon, fading smoothly into the background color (no sharp boundaries).
- [ ] **Axes Compass (XYZ Widget)**: Small, non-interactive widget in the bottom-left corner of the viewport showing orientation.
- [ ] **Vanishing Points Indicator**: Interactive or visual guide lines projecting from the bounding box vertices of the selected object, converging at vanishing points on the horizon line.

---

## 5. Overlay Dialogs & Temporary States

Design these transient states that appear on top of the main layout:

### [ ] Drag-and-Drop Drop Zone Overlay
- [ ] Triggered when dragging a `.glb` file over the window.
- [ ] Full-screen backdrop overlay (`rgba(0, 0, 0, 0.4)` or semi-transparent blue tint) with a prominent dashed border.
- [ ] Center icon (e.g., 📥) with text: "Drop GLB model to import into scene".

### [ ] Global Settings Modal
- [ ] A card overlaying the center of the screen with a dark, semi-transparent backdrop.
- [ ] Tabs or sections:
  - *Viewport*: Grid size, grid subdivision, grid visibility toggles, snapping increments.
  - *Render quality*: WebGPU features, shadows resolution.
  - *Performance*: FPS counter toggle, diagnostic panel.
- [ ] "Save/Close" button.

### [ ] Keyboard Shortcuts Cheat Sheet Modal
- [ ] Clean table/grid listing shortcuts:
  - `W` / `E` / `R` / `T` / `S` → Transform controls (Translate, Rotate, Scale, Select).
  - `Ctrl + Z` / `Ctrl + Y` → Undo / Redo.
  - `Delete` / `Backspace` → Delete selected object.
  - `Escape` → Clear selection.
  - `P` / `O` → Switch between Perspective and Orthographic cameras.

---

## 6. UI Polish & Design Language Requirements

Apply these styling and UI principles in your layouts:

### [ ] Design Tokens (Sleek Dark Glassmorphism)
- [ ] **Backgrounds**: Dark charcoal / deep navy translucent layers (e.g., `rgba(15, 15, 25, 0.92)`).
- [ ] **Backdrop Filters**: Heavy blur (`backdrop-filter: blur(12px)`) for all floating components.
- [ ] **Borders**: Subtly glowing, low-opacity borders (e.g., `1px solid rgba(255, 255, 255, 0.08)`).
- [ ] **Accent Color**: Vibrant primary blue (e.g., `#4a9eff` or `#3b82f6`) for selected items, active toggle buttons, and active inputs.
- [ ] **Typography**: Modern sans-serif (e.g., **Inter** or **Outfit**) for readability. Monospace font (**JetBrains Mono** or **Fira Code**) for numeric coordinate input boxes.

### [ ] Touch Targets (Mobile Optimization)
- [ ] Ensure all interactive buttons on tablet and mobile viewports have touch-friendly sizing (minimum **44px x 44px**) and spacing to prevent misclicks.
- [ ] Coordinate input controls must be easy to focus with virtual keyboard activation.
