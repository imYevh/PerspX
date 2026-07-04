<script lang="ts">
  import Panel from './Panel.svelte';
  import { getPrimitiveList, type PrimitiveType } from '$lib/objects/primitives';
  import type { ObjectManager } from '$lib/objects/object-manager';
  import type { LightManager } from '$lib/lighting/light-manager';
  import { uiStore } from '$lib/stores/ui';

  interface Props {
    objectManager: ObjectManager | undefined;
    lightManager: LightManager | undefined;
  }
  let { objectManager, lightManager }: Props = $props();

  const primitives = getPrimitiveList();

  function addPrimitive(type: PrimitiveType) {
    objectManager?.addPrimitive(type);
  }

  function addLight(type: 'point' | 'directional' | 'spot') {
    if (!lightManager) return;
    lightManager.addLight({ type, intensity: 1, color: 0xffffff });
  }
</script>

<Panel title="📦 Library">
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
        <span class="lib-icon">{p.icon}</span>
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
</Panel>

<style>
  .library-section-title {
    font-size: 10px;
    font-weight: 700;
    color: #666;
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
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 6px;
    cursor: pointer;
    color: #ccc;
    font-size: 11px;
    transition: all 0.15s;
  }

  .lib-item:hover {
    background: rgba(74,158,255,0.1);
    border-color: rgba(74,158,255,0.3);
    color: #e0e0e0;
    transform: translateY(-1px);
  }

  .lib-icon {
    font-size: 22px;
    line-height: 1;
  }

  .lib-label {
    font-size: 10px;
    color: #888;
  }
</style>
