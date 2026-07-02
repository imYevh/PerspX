# 01 — Project Setup

## Goal
Scaffold the PerspX project with Vite, TypeScript, and Three.js. Get a blank canvas rendering with WebGPU.

---

## Prerequisites

- **Node.js** ≥ 20.x
- **npm** ≥ 10.x (or pnpm)
- A WebGPU-capable browser (Chrome 113+, Firefox 128+, Safari 18+)

---

## Steps

### 1. Initialize Vite Project

```bash
npx -y create-vite@latest ./ --template vanilla-ts
```

### 2. Install Dependencies

```bash
npm install three
npm install -D @types/three
```

### 3. Configure TypeScript

Update `tsconfig.json`:

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts"]
}
```

### 4. Configure Vite

Update `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'es2022',
    minify: 'terser',
    sourcemap: true,
  },
  server: {
    port: 3000,
    open: true,
  },
});
```

### 5. Clean Default Files

- Delete `src/counter.ts`, `src/style.css` (will replace), `src/typescript.svg`
- Clear `src/main.ts` — will be rewritten in the next phase

### 6. Create Directory Structure

```bash
mkdir -p src/core src/camera src/objects src/transforms
mkdir -p src/lighting src/materials src/helpers
mkdir -p src/ui/panels src/state src/utils
mkdir -p public/models public/textures
```

### 7. Create Entry HTML

`index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <meta name="description" content="PerspX — 3D Perspective Visualization Tool for Artists" />
  <title>PerspX</title>
  <link rel="stylesheet" href="/src/styles/main.css" />
</head>
<body>
  <div id="app">
    <canvas id="viewport"></canvas>
  </div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

### 8. Create Base Styles

`src/styles/main.css`:

```css
/* Reset */
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: #0a0a0a;
  color: #e0e0e0;
}

#app {
  width: 100%;
  height: 100%;
  position: relative;
}

#viewport {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none; /* Critical for mobile — prevents browser gestures */
}
```

---

## Verification

```bash
npm run dev
```

- Browser opens at `http://localhost:3000`
- You see a black canvas filling the entire viewport
- No console errors
- Vite HMR is working (edit a file, see instant updates)

---

## Output

After this phase, you have:
- [x] Vite + TypeScript project with path aliases
- [x] Three.js installed
- [x] Full-screen canvas ready for rendering
- [x] Directory structure matching the architecture
- [x] Mobile-ready viewport meta tag

---

## Next → [02-core-renderer.md](./02-core-renderer.md)
