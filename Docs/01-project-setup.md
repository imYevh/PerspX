# 01 — Project Setup

## Goal
Scaffold the PerspX project with SvelteKit (SPA mode), TypeScript, and Three.js. Get a blank canvas rendering with WebGPU.

---

## Prerequisites

- **Node.js** ≥ 20.x
- **npm** ≥ 10.x (or pnpm)
- A WebGPU-capable browser (Chrome 113+, Firefox 128+, Safari 18+)

---

## Steps

### 1. Initialize SvelteKit Project

```bash
npx -y sv create ./ --template minimal --types ts --no-add-ons
```

### 2. Install Dependencies

```bash
npm install three
npm install -D @types/three @sveltejs/adapter-static
```

### 3. Configure SvelteKit for SPA Mode

`svelte.config.js`:

```js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      fallback: 'index.html', // SPA mode — all routes serve the same HTML
    }),
    alias: {
      '$lib': './src/lib',
      '$lib/*': './src/lib/*',
    },
  },
};

export default config;
```

### 4. Configure Vite

`vite.config.ts`:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    target: 'es2022',
  },
  server: {
    port: 3000,
    open: true,
  },
});
```

### 5. Disable SSR (SPA-Only)

Create `src/routes/+layout.ts`:

```ts
export const prerender = true;
export const ssr = false;
```

### 6. Configure TypeScript

The SvelteKit scaffolder generates `tsconfig.json` automatically. Ensure it extends the SvelteKit config:

```jsonc
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleResolution": "bundler"
  }
}
```

### 7. Create Directory Structure

```bash
mkdir -p src/lib/core src/lib/camera src/lib/objects src/lib/transforms
mkdir -p src/lib/lighting src/lib/materials src/lib/helpers
mkdir -p src/lib/components/panels src/lib/stores src/lib/utils
mkdir -p static/models static/textures
```

### 8. Create App HTML Shell

`src/app.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <meta name="description" content="PerspX — 3D Perspective Visualization Tool for Artists" />
  <title>PerspX</title>
  <link rel="icon" href="%sveltekit.assets%/favicon.png" />
  %sveltekit.head%
</head>
<body data-sveltekit-preload-data="hover">
  <div id="app">%sveltekit.body%</div>
</body>
</html>
```

### 9. Create Global Styles

`src/app.css`:

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
```

### 10. Create Root Layout

`src/routes/+layout.svelte`:

```svelte
<script>
  import '../app.css';

  let { children } = $props();
</script>

{@render children()}
```

### 11. Create Main Page with Viewport Canvas

`src/routes/+page.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  let canvas: HTMLCanvasElement;

  onMount(() => {
    // Three.js will be initialized here in the next phase
    console.log('Canvas ready:', canvas);
  });
</script>

<canvas bind:this={canvas} id="viewport"></canvas>

<style>
  #viewport {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none; /* Critical for mobile — prevents browser gestures */
  }
</style>
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
- [x] SvelteKit project in SPA mode with TypeScript
- [x] Three.js installed
- [x] Full-screen canvas ready for rendering
- [x] Directory structure matching the architecture (`src/lib/` convention)
- [x] Mobile-ready viewport meta tag
- [x] SSR disabled (client-side only rendering)
- [x] `adapter-static` configured for Tauri compatibility

---

## Next → [02-core-renderer.md](./02-core-renderer.md)
