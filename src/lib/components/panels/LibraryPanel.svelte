<script lang="ts">
  import Panel from './Panel.svelte';
  import { getPrimitiveList, type PrimitiveType } from '$lib/objects/primitives';
  import type { ObjectManager } from '$lib/objects/object-manager';

  interface Props {
    objectManager: ObjectManager | undefined;
  }
  let { objectManager }: Props = $props();

  const primitives = getPrimitiveList();

  function addPrimitive(type: PrimitiveType) {
    objectManager?.addPrimitive(type);
  }
</script>

<Panel title="📦 Library">
  <div class="library-grid">
    {#each primitives as p}
      <button
        class="lib-item"
        onclick={() => addPrimitive(p.type)}
        title="Add {p.label}"
      >
        <span class="lib-icon">{p.icon}</span>
        <span class="lib-label">{p.label}</span>
      </button>
    {/each}
  </div>
</Panel>

<style>
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
