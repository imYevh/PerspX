<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  export interface ContextMenuItem {
    id: string;
    label: string;
    icon?: string;
    shortcut?: string;
    disabled?: boolean;
    divider?: boolean;
    danger?: boolean;
  }

  interface Props {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onSelect: (id: string) => void;
    onClose: () => void;
  }

  let { x, y, items, onSelect, onClose }: Props = $props();

  let menuEl: HTMLDivElement | undefined = $state();

  // Clamp position so menu doesn't overflow viewport — start at prop values
  let adjustedX = $state(0);
  let adjustedY = $state(0);

  $effect(() => {
    // Runs on mount and whenever x/y change
    let ax = x;
    let ay = y;
    if (menuEl) {
      const rect = menuEl.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (x + rect.width > vw) ax = vw - rect.width - 8;
      if (y + rect.height > vh) ay = vh - rect.height - 8;
    }
    adjustedX = ax;
    adjustedY = ay;
  });

  function handleSelect(item: ContextMenuItem) {
    if (item.disabled || item.divider) return;
    onSelect(item.id);
    onClose();
  }

  function handleOutsideClick(e: MouseEvent | PointerEvent) {
    if (menuEl && !menuEl.contains(e.target as Node)) {
      onClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }

  onMount(() => {
    // Slight delay so the triggering contextmenu event doesn't immediately close it
    requestAnimationFrame(() => {
      document.addEventListener('pointerdown', handleOutsideClick, { capture: true });
      document.addEventListener('keydown', handleKeydown);
    });
  });

  onDestroy(() => {
    document.removeEventListener('pointerdown', handleOutsideClick, { capture: true });
    document.removeEventListener('keydown', handleKeydown);
  });

  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      }
    };
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  use:portal
  class="context-menu"
  style="left: {adjustedX}px; top: {adjustedY}px;"
  bind:this={menuEl}
  transition:scale={{ duration: 130, start: 0.92, opacity: 0, easing: quintOut }}
  oncontextmenu={(e) => e.preventDefault()}
>
  {#each items as item (item.id)}
    {#if item.divider}
      <div class="divider"></div>
    {:else}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <button
        class="menu-item"
        class:danger={item.danger}
        class:disabled={item.disabled}
        disabled={item.disabled}
        onclick={() => handleSelect(item)}
      >
        {#if item.icon}
          <span class="item-icon">{@html item.icon}</span>
        {/if}
        <span class="item-label">{item.label}</span>
        {#if item.shortcut}
          <span class="item-shortcut">{item.shortcut}</span>
        {/if}
      </button>
    {/if}
  {/each}
</div>

<style>
  .context-menu {
    position: fixed;
    z-index: 9999;
    min-width: 160px;
    background: var(--color-dropdown-bg, var(--color-surface-hover));
    backdrop-filter: blur(var(--backdrop-blur));
    -webkit-backdrop-filter: blur(var(--backdrop-blur));
    border: 1px solid var(--color-border);
    border-radius: 8px;
    box-shadow: var(--shadow-panel), 0 4px 16px rgba(0, 0, 0, 0.35);
    padding: 4px;
    display: flex;
    flex-direction: column;
    transform-origin: top left;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 10px;
    background: transparent;
    border: none;
    border-radius: 5px;
    color: var(--color-text);
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s, color 0.1s;
    white-space: nowrap;
  }

  .menu-item:hover:not(.disabled) {
    background: var(--color-surface-active);
  }

  .menu-item.danger:hover:not(.disabled) {
    background: rgba(239, 68, 68, 0.18);
    color: var(--color-danger);
  }

  .menu-item.disabled {
    color: var(--color-text-dim);
    cursor: not-allowed;
  }

  .item-icon {
    font-size: 13px;
    width: 16px;
    text-align: center;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .item-icon :global(svg) {
    width: 14px;
    height: 14px;
    fill: currentColor;
  }

  .item-label {
    flex: 1;
  }

  .item-shortcut {
    color: var(--color-text-dim);
    font-size: 10px;
    margin-left: 16px;
  }
  
  @media (max-width: 768px) {
    .item-shortcut {
      display: none;
    }
  }

  .divider {
    height: 1px;
    background: var(--color-border);
    margin: 4px 0;
  }
</style>
