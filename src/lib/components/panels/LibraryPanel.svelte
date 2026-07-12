<script lang="ts">
  import Panel from './Panel.svelte';
  import { getPrimitiveList, type PrimitiveType } from '$lib/objects/primitives';
  import type { ObjectManager } from '$lib/objects/object-manager';
  import type { LightManager } from '$lib/lighting/light-manager';
  import { uiStore } from '$lib/stores/ui';
  import { MODEL_MAX_FILE_SIZE } from '$lib/objects/model-loader';

  interface Props {
    objectManager: ObjectManager | undefined;
    lightManager: LightManager | undefined;
  }
  let { objectManager, lightManager }: Props = $props();

  const primitives = getPrimitiveList();

  // ── Accordion state ────────────────────────────────────────────────────────
  let accordions = $state({
    primitives: true,
    lights: false,
    models: false
  });

  function toggleAccordion(section: keyof typeof accordions) {
    accordions[section] = !accordions[section];
  }

  // ── Model import state ─────────────────────────────────────────────────────
  let isLoadingModel = $state(false);
  let modelError = $state<string | null>(null);
  let modelWarning = $state<string | null>(null);
  let modelSuccessName = $state<string | null>(null);
  let dismissTimerError: ReturnType<typeof setTimeout> | null = null;
  let dismissTimerWarning: ReturnType<typeof setTimeout> | null = null;
  let dismissTimerSuccess: ReturnType<typeof setTimeout> | null = null;

  function setModelError(msg: string) {
    modelError = msg;
    if (dismissTimerError) clearTimeout(dismissTimerError);
    dismissTimerError = setTimeout(() => { modelError = null; }, 6000);
  }

  function setModelWarning(msg: string) {
    modelWarning = msg;
    if (dismissTimerWarning) clearTimeout(dismissTimerWarning);
    dismissTimerWarning = setTimeout(() => { modelWarning = null; }, 8000);
  }

  function setModelSuccess(name: string) {
    modelSuccessName = name;
    if (dismissTimerSuccess) clearTimeout(dismissTimerSuccess);
    dismissTimerSuccess = setTimeout(() => { modelSuccessName = null; }, 4000);
  }

  async function importModelFromFile(file: File) {
    if (!objectManager) return;

    isLoadingModel = true;
    modelError = null;
    modelWarning = null;
    modelSuccessName = null;

    const result = await objectManager.addModel(file);

    isLoadingModel = false;

    if (!result.ok) {
      setModelError(result.message);
    } else {
      if (result.hasPerformanceWarning) {
        setModelWarning('This model has a high polygon count and may affect performance.');
      }
      setModelSuccess(file.name.replace(/\.[^/.]+$/, '').trim() || 'Model');
    }
  }

  function openFilePicker() {
    if (isLoadingModel) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.glb,.gltf,.obj,.fbx';
    input.multiple = false;
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      await importModelFromFile(file);
    };
    input.click();
  }

  function addPrimitive(type: PrimitiveType) {
    objectManager?.addPrimitive(type);
  }

  function addLight(type: 'point' | 'directional' | 'spot') {
    if (!lightManager) return;
    lightManager.addLight({ type, intensity: 1, color: 0xffffff });
  }

  const maxMB = MODEL_MAX_FILE_SIZE / 1024 / 1024;
</script>

<Panel title="Library">
  <!-- Primitives Section -->
  <button class="accordion-header" class:open={accordions.primitives} onclick={() => toggleAccordion('primitives')}>
    <div class="accordion-title-wrap">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="accordion-chevron"><path d="m9 18 6-6-6-6"/></svg>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="accordion-icon"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><line x1="12" y1="22" x2="12" y2="12"></line></svg>
      <span>Primitives</span>
    </div>
    <span class="accordion-badge">[{primitives.length}]</span>
  </button>
  <div class="accordion-content" class:open={accordions.primitives}>
    <div class="accordion-inner">
      <div class="accordion-inner-padding">
        <div class="library-grid">
          {#each primitives as p}
            <button
              class="lib-item"
              draggable="true"
              ondragstart={(e) => {
                e.dataTransfer?.setData('application/perspx-type', 'primitive');
                e.dataTransfer?.setData('application/perspx-item', p.type);
                const img = new Image();
                img.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
                e.dataTransfer?.setDragImage(img, 0, 0);
                uiStore.update(s => ({ ...s, drag: { active: true, type: 'primitive', item: p.type } }));
              }}
              ondragend={() => uiStore.update(s => ({ ...s, drag: { active: false, type: null, item: null } }))}
              onclick={() => addPrimitive(p.type)}
              title="Add {p.label}"
            >
              <span class="lib-icon">{p.icon}</span>
              <span class="lib-label">{p.label}</span>
            </button>
          {/each}
        </div>
      </div>
    </div>
  </div>

  <!-- Lights Section -->
  <button class="accordion-header" class:open={accordions.lights} onclick={() => toggleAccordion('lights')}>
    <div class="accordion-title-wrap">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="accordion-chevron"><path d="m9 18 6-6-6-6"/></svg>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="accordion-icon"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.2 1.5 1.5 2.5"></path><path d="M9 18h6"></path><path d="M10 22h4"></path></svg>
      <span>Lights</span>
    </div>
    <span class="accordion-badge">[3]</span>
  </button>
  <div class="accordion-content" class:open={accordions.lights}>
    <div class="accordion-inner">
      <div class="accordion-inner-padding">
        <div class="library-grid">
          <button class="lib-item" draggable="true"
            ondragstart={(e) => {
              e.dataTransfer?.setData('application/perspx-type', 'light');
              e.dataTransfer?.setData('application/perspx-item', 'point');
              const img = new Image(); img.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; e.dataTransfer?.setDragImage(img, 0, 0);
              uiStore.update(s => ({ ...s, drag: { active: true, type: 'light', item: 'point' } }));
            }}
            ondragend={() => uiStore.update(s => ({ ...s, drag: { active: false, type: null, item: null } }))}
            onclick={() => addLight('point')} title="Add Point Light">
            <span class="lib-icon">💡</span>
            <span class="lib-label">Point</span>
          </button>
          <button class="lib-item" draggable="true"
            ondragstart={(e) => {
              e.dataTransfer?.setData('application/perspx-type', 'light');
              e.dataTransfer?.setData('application/perspx-item', 'directional');
              const img = new Image(); img.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; e.dataTransfer?.setDragImage(img, 0, 0);
              uiStore.update(s => ({ ...s, drag: { active: true, type: 'light', item: 'directional' } }));
            }}
            ondragend={() => uiStore.update(s => ({ ...s, drag: { active: false, type: null, item: null } }))}
            onclick={() => addLight('directional')} title="Add Directional Light">
            <span class="lib-icon">☀️</span>
            <span class="lib-label">Directional</span>
          </button>
          <button class="lib-item" draggable="true"
            ondragstart={(e) => {
              e.dataTransfer?.setData('application/perspx-type', 'light');
              e.dataTransfer?.setData('application/perspx-item', 'spot');
              const img = new Image(); img.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; e.dataTransfer?.setDragImage(img, 0, 0);
              uiStore.update(s => ({ ...s, drag: { active: true, type: 'light', item: 'spot' } }));
            }}
            ondragend={() => uiStore.update(s => ({ ...s, drag: { active: false, type: null, item: null } }))}
            onclick={() => addLight('spot')} title="Add Spot Light">
            <span class="lib-icon">🔦</span>
            <span class="lib-label">Spot</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 3D Models Section -->
  <button class="accordion-header" class:open={accordions.models} onclick={() => toggleAccordion('models')}>
    <div class="accordion-title-wrap">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="accordion-chevron"><path d="m9 18 6-6-6-6"/></svg>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="accordion-icon"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
      <span>3D Models</span>
    </div>
  </button>
  <div class="accordion-content" class:open={accordions.models}>
    <div class="accordion-inner">
      <div class="accordion-inner-padding">
        {#if modelError}
          <div class="model-status model-status--error" role="alert">
            <span class="model-status-icon"></span>
            <span class="model-status-text">{modelError}</span>
            <button class="model-status-close" onclick={() => { modelError = null; }}>✕</button>
          </div>
        {/if}
        {#if modelWarning}
          <div class="model-status model-status--warning" role="status">
            <span class="model-status-icon"></span>
            <span class="model-status-text">{modelWarning}</span>
            <button class="model-status-close" onclick={() => { modelWarning = null; }}>✕</button>
          </div>
        {/if}
        {#if modelSuccessName && !modelError}
          <div class="model-status model-status--success" role="status">
            <span class="model-status-icon"></span>
            <span class="model-status-text">"{modelSuccessName}" added to scene.</span>
          </div>
        {/if}

        <button
          class="import-model-btn"
          class:loading={isLoadingModel}
          disabled={isLoadingModel}
          onclick={openFilePicker}
          title="Import 3D model (.glb, .gltf, .obj, .fbx) — max {maxMB} MB"
        >
          {#if isLoadingModel}
            <span class="spinner" aria-hidden="true"></span>
            <span>Importing…</span>
          {:else}
            <span class="lib-icon"></span>
            <span>Import Model</span>
          {/if}
        </button>
        <p class="model-hint">GLB · GLTF · OBJ · FBX · max {maxMB} MB</p>
        <p class="model-hint">Click again to import another model.</p>
      </div>
    </div>
  </div>
</Panel>

<style>
  /* ── Accordions ───────────────────────────────────────────────────────── */
  .accordion-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    background: transparent;
    border: 1px solid transparent;
    padding: 8px 10px;
    margin-top: 4px;
    border-radius: 6px;
    cursor: pointer;
    color: var(--color-text-dim);
    transition: all 0.15s;
  }
  .accordion-header:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }
  .accordion-header.open {
    color: var(--color-text);
  }

  .accordion-title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .accordion-chevron {
    transition: transform 0.2s ease;
    opacity: 0.6;
  }
  .accordion-header.open .accordion-chevron {
    transform: rotate(90deg);
  }
  
  .accordion-icon {
    opacity: 0.8;
  }

  .accordion-badge {
    font-size: 10px;
    background: rgba(255, 255, 255, 0.05);
    padding: 2px 6px;
    border-radius: 4px;
    color: var(--color-text-muted);
  }

  .accordion-content {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.2s ease-out;
  }
  .accordion-content.open {
    grid-template-rows: 1fr;
  }

  .accordion-inner {
    overflow: hidden;
  }
  
  .accordion-inner-padding {
    padding: 6px 0 8px 0;
  }

  /* ── Library Grid ─────────────────────────────────────────────────────── */
  .library-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4px;
  }

  .lib-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 4px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    cursor: pointer;
    color: var(--color-text-muted);
    font-size: 11px;
    transition: all 0.15s;
  }

  .lib-item:hover {
    background: var(--color-accent-muted);
    border-color: var(--color-accent);
    color: var(--color-text);
    transform: translateY(-1px);
  }

  .lib-icon {
    font-size: 22px;
    line-height: 1;
  }

  .lib-label {
    font-size: 10px;
    color: var(--color-text-muted);
  }

  /* ── Import Model Button ──────────────────────────────────────────── */
  .import-model-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 10px 12px;
    background: var(--color-accent-muted);
    border: 1px solid var(--color-accent);
    border-radius: 6px;
    color: var(--color-accent);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    margin-top: 2px;
  }

  .import-model-btn:hover:not(:disabled) {
    background: var(--color-accent-muted);
    border-color: var(--color-accent-hover);
    color: var(--color-accent-hover);
    transform: translateY(-1px);
  }

  .import-model-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .import-model-btn .lib-icon {
    font-size: 16px;
  }

  /* ── Spinner ──────────────────────────────────────────────────────── */
  .spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid var(--color-accent-muted);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* ── Hint text ────────────────────────────────────────────────────── */
  .model-hint {
    font-size: 10px;
    color: var(--color-text-dim);
    text-align: center;
    margin: 3px 0 0 0;
    line-height: 1.4;
  }

  /* ── Status messages ──────────────────────────────────────────────── */
  .model-status {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 7px 9px;
    border-radius: 5px;
    font-size: 11px;
    line-height: 1.4;
    margin-bottom: 5px;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .model-status--error {
    background: rgba(255, 80, 80, 0.12);
    border: 1px solid rgba(255, 80, 80, 0.25);
    color: #ff9090;
  }

  .model-status--warning {
    background: rgba(255, 212, 59, 0.1);
    border: 1px solid rgba(255, 212, 59, 0.25);
    color: #ffd43b;
  }

  .model-status--success {
    background: rgba(81, 207, 102, 0.1);
    border: 1px solid rgba(81, 207, 102, 0.25);
    color: #74d98e;
  }

  .model-status-icon {
    flex-shrink: 0;
    font-size: 12px;
  }

  .model-status-text {
    flex: 1;
  }

  .model-status-close {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 10px;
    opacity: 0.7;
    padding: 0;
    line-height: 1;
    flex-shrink: 0;
    transition: opacity 0.1s;
  }

  .model-status-close:hover {
    opacity: 1;
  }
</style>
