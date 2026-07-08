<script lang="ts">
  import { uiStore } from '$lib/stores/ui';

  const toggles = [
    { id: 'edges', label: 'EDGES' },
    { id: 'half', label: 'HALF' },
    { id: 'third', label: 'THIRD' },
    { id: 'cross', label: 'CROSS' },
    { id: 'solid', label: 'SOLID' },
    { id: 'xyz', label: 'XYZ' }
  ] as const;

  function toggleOverlay(id: keyof typeof $uiStore.overlays) {
    uiStore.update((s) => ({
      ...s,
      overlays: {
        ...s.overlays,
        [id]: !s.overlays[id]
      }
    }));
  }
</script>

<div class="overlays-toolbar pointer-events-auto">
  {#each toggles as toggle}
    <button
      class="toggle-btn"
      class:active={$uiStore.overlays[toggle.id]}
      onclick={() => toggleOverlay(toggle.id)}
    >
      {toggle.label}
    </button>
  {/each}
</div>

<style>
  .overlays-toolbar {
    position: absolute;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    border-radius: 8px;
    display: flex;
    padding: 8px;
    gap: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .toggle-btn {
    padding: 8px 16px;
    border: none;
    background: transparent;
    border-radius: 4px;
    font-weight: 600;
    font-size: 14px;
    color: #888;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .toggle-btn:hover {
    color: #444;
    background: #f0f0f0;
  }

  .toggle-btn.active {
    background: #ff6b6b;
    color: white;
  }
</style>
