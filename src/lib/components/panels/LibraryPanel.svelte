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

<Panel title="📚 Library">
  <div class="library-section-title">Primitives</div>
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
        <span class="lib-label">{p.label}</span>
      </button>
    {/each}
  </div>

  <div class="library-section-title">Lights</div>
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
      <span class="lib-label">Spot</span>
    </button>
  </div>

  <!-- ── 3D Models section ─────────────────────────────────────────── -->
  <div class="library-section-title">3D Models</div>

  {#if modelError}
    <div class="model-status model-status--error" role="alert">
      <span class="model-status-icon">⚠️</span>
      <span class="model-status-text">{modelError}</span>
      <button class="model-status-close" onclick={() => { modelError = null; }}>✕</button>
    </div>
  {/if}
  {#if modelWarning}
    <div class="model-status model-status--warning" role="status">
      <span class="model-status-icon">⚡</span>
      <span class="model-status-text">{modelWarning}</span>
      <button class="model-status-close" onclick={() => { modelWarning = null; }}>✕</button>
    </div>
  {/if}
  {#if modelSuccessName && !modelError}
    <div class="model-status model-status--success" role="status">
      <span class="model-status-icon">✓</span>
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
      <span>Import Model</span>
    {/if}
  </button>
  <p class="model-hint">GLB · GLTF · OBJ · FBX · max {maxMB} MB</p>
  <p class="model-hint">Click again to import another model.</p>
</Panel>

<style>
  .library-section-title {
    font-size: 10px;
    font-weight: 700;
    color: var(--color-text-dim);
    text-transform: uppercase;
    letter-spacing: 0.7px;
    margin: 12px 0 6px 0;
  }
  .library-section-title:first-child {
    margin-top: 4px;
  }

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
