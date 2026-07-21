<div align="center">
  <h1>PerspX</h1>
  <p><strong>A web-based 3D workspace and precision perspective drawing tool</strong></p>

  <p>
    <a href="https://svelte.dev"><img src="https://img.shields.io/badge/Svelte-5-FF3E00?style=flat&logo=svelte&logoColor=white" alt="Svelte 5" /></a>
    <a href="https://threejs.org/"><img src="https://img.shields.io/badge/Three.js-black?style=flat&logo=three.js&logoColor=white" alt="Three.js" /></a>
    <a href="https://tauri.app/"><img src="https://img.shields.io/badge/Tauri-2-FFC131?style=flat&logo=tauri&logoColor=white" alt="Tauri" /></a>
    <a href="https://capacitorjs.com/"><img src="https://img.shields.io/badge/Capacitor-8-119EFF?style=flat&logo=capacitor&logoColor=white" alt="Capacitor" /></a>
  </p>
</div>

> [!TIP]
> **Try it out!** 
> *[Link to Live Web Demo - Replace this with your actual URL]*

## 🚀 Key Features

*   **Perspective Tools**: Dynamic grids and interactive vanishing points for accurate spatial drawing.
*   **Precision Geometry**: Advanced snapping system ensuring your lines and primitives connect perfectly.
*   **Rich Asset Library**: Built-in library panel for primitives, shader previews, and light presets.
*   **Cross-Platform Ready**: Run it seamlessly on the Web, as a Desktop app (via Tauri), or on Android (via Capacitor).

---

## 📸 Walkthrough & Demonstration

*(Replace the placeholder links below with your actual screenshots or GIFs showing the app in action!)*

### Workspace & Drawing
![Workspace Overview](https://placehold.co/800x400/222222/FFFFFF/png?text=Showcase+your+workspace+and+viewport+here)

### Vanishing Points & Snapping
![Vanishing Points Demo](https://placehold.co/800x400/222222/FFFFFF/png?text=GIF+of+Vanishing+Points+and+Snapping)

### Scrub Input & UI Panels
![UI Panels](https://placehold.co/800x400/222222/FFFFFF/png?text=Screenshot+of+Library+Panel+and+Scrub+Inputs)

---

## ⌨️ Keyboard Shortcuts

PerspX is designed for productivity. Here are the default keyboard shortcuts:

| Action | Shortcut (Windows/Linux) | Shortcut (macOS) |
| :--- | :--- | :--- |
| **Global** | | |
| Toggle Grid | `1` | `1` |
| Toggle Vanishing Point | `2` | `2` |
| **Edit & History** | | |
| Undo | `Ctrl+Z` | `Cmd+Z` |
| Redo | `Ctrl+Shift+Z` / `Ctrl+Y` | `Cmd+Shift+Z` / `Cmd+Y` |
| Copy / Cut / Paste | `Ctrl+C` / `X` / `V` | `Cmd+C` / `X` / `V` |
| Duplicate | `Ctrl+D` | `Cmd+D` |
| **Selection & Objects** | | |
| Select All | `Ctrl+A` | `Cmd+A` |
| Deselect All / Detach | `Esc` | `Esc` |
| Delete | `Delete` / `Backspace`| `Delete` / `Backspace`|
| Rename | `F2` | `F2` |
| **Transform Modes** | | |
| Move (Translate) | `G` or `T` | `G` or `T` |
| Rotate | `R` | `R` |
| Scale | `S` | `S` |
| Toggle Transform Space | `X` | `X` |

---

## 🛠️ Getting Started (Development)

To run PerspX locally, you will need **Node.js**.

1. **Clone and Install**
   ```bash
   git clone https://github.com/your-username/perspx.git
   cd perspx
   npm install
   ```

2. **Run the Web App**
   Start the development server with Hot Module Replacement (HMR):
   ```bash
   npm run dev
   ```

3. **Run the Desktop App (Tauri)**
   Requires [Rust and Tauri prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites):
   ```bash
   npm run tauri dev
   ```

4. **Run the Android App (Capacitor)**
   Requires [Android Studio](https://developer.android.com/studio):
   ```bash
   npm run build:android
   ```

---

## 🏗️ Technology Stack

*   **Frontend UI**: [Svelte 5](https://svelte.dev/) & [Tailwind CSS v4](https://tailwindcss.com/)
*   **3D & Rendering**: [Three.js](https://threejs.org/)
*   **Desktop Shell**: [Tauri 2](https://v2.tauri.app/)
*   **Mobile Shell**: [Capacitor 8](https://capacitorjs.com/)

---

## 📄 License

*(Add your open-source license information here, e.g., MIT License)*
