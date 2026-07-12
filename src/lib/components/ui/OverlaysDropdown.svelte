<script lang="ts">
  import overlaysIcon from '$lib/assets/overlays.svg?raw';
  import Dropdown from './Dropdown.svelte';
  import { uiStore } from '$lib/stores/ui';

  interface Props {
    align?: 'left' | 'right' | 'center';
  }
  let { align = 'left' }: Props = $props();

  const overlaysItems = [
    { id: 'edges', label: 'Edges' },
    { id: 'half', label: 'Half' },
    { id: 'third', label: 'Third' },
    { id: 'cross', label: 'Cross' },
    { id: 'solid', label: 'Solid' },
    { id: 'xyz', label: 'XYZ' },
    { id: 'textured', label: 'Textured' }
  ];

  function toggleOverlay(id: string) {
    const key = id as keyof typeof $uiStore.overlays;
    uiStore.update((s) => ({
      ...s,
      overlays: {
        ...s.overlays,
        [key]: !s.overlays[key]
      }
    }));
  }
</script>

<Dropdown 
  icon={overlaysIcon} 
  title="Primitive Overlays" 
  hideLabelOnMobile={true}
  isMobile={$uiStore.breakpoint === 'mobile'}
  direction="down"
  align={align}
>
  <div class="popover-content">
    <div class="overlays-grid">
      {#each overlaysItems as item}
        <button 
          class="toggle-btn" 
          class:active={$uiStore.overlays[item.id as keyof typeof $uiStore.overlays]}
          onclick={() => toggleOverlay(item.id)}
        >
          <div class="checkbox">
            {#if $uiStore.overlays[item.id as keyof typeof $uiStore.overlays]}✓{/if}
          </div>
          {item.label}
        </button>
      {/each}
    </div>
  </div>
</Dropdown>

<style>
  .popover-content {
    padding: 8px;
    background: var(--color-surface);
    border-radius: 8px;
    width: max-content;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .overlays-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    min-width: 200px;
  }
  .toggle-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    color: var(--color-text);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
  }
  .toggle-btn:hover {
    background: var(--color-surface-hover);
  }
  .toggle-btn.active {
    background: var(--color-accent-muted);
    border-color: var(--color-accent);
  }
  .checkbox {
    width: 14px;
    height: 14px;
    border-radius: 3px;
    border: 1px solid var(--color-text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: var(--color-accent);
  }
  .toggle-btn.active .checkbox {
    border-color: var(--color-accent);
  }
</style>
