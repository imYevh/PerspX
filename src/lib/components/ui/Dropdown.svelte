<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Snippet } from 'svelte';

  export interface DropdownItem {
    id: string;
    label: string;
    icon?: string;
    shortcut?: string;
    disabled?: boolean;
    divider?: boolean;
    danger?: boolean;
    keepOpenOnClick?: boolean;
  }

  interface Props {
    icon?: string;
    label?: string;
    title?: string;
    items?: DropdownItem[];
    onSelect?: (id: string) => void;
    hideLabelOnMobile?: boolean;
    isMobile?: boolean;
    direction?: 'down' | 'up';
    align?: 'left' | 'right' | 'center';
    children?: Snippet;
  }

  let { 
    icon, 
    label, 
    title, 
    items, 
    onSelect,
    hideLabelOnMobile = false,
    isMobile = false,
    direction = 'down',
    align = 'left',
    children
  }: Props = $props();

  let isOpen = $state(false);
  let dropdownRef: HTMLDivElement | undefined = $state();

  function toggle() {
    isOpen = !isOpen;
  }

  function handleSelect(item: DropdownItem) {
    if (item.disabled || item.divider) return;
    if (!item.keepOpenOnClick) {
      isOpen = false;
    }
    if (onSelect) onSelect(item.id);
  }

  function handleClickOutside(e: Event) {
    if (isOpen && dropdownRef && !dropdownRef.contains(e.target as Node)) {
      isOpen = false;
    }
  }

  onMount(() => {
    document.addEventListener('pointerdown', handleClickOutside);
  });

  onDestroy(() => {
    document.removeEventListener('pointerdown', handleClickOutside);
  });
</script>

<div class="dropdown-wrapper" bind:this={dropdownRef}>
  <button class="tool-btn" {title} onclick={toggle} class:active={isOpen}>
    {#if icon}
      <span class="tool-icon">{@html icon}</span>
    {/if}
    {#if label}
      {#if !(hideLabelOnMobile && isMobile)}
        <span class="tool-label">{label}</span>
      {/if}
    {/if}
  </button>

  {#if isOpen}
    <div class="dropdown-menu" 
         class:direction-up={direction === 'up'}
         class:align-right={align === 'right'}
         class:align-center={align === 'center'}>
      {#if children}
        {@render children()}
      {:else if items}
        {#each items as item}
          {#if item.divider}
          <div class="dropdown-divider"></div>
        {:else}
          <button 
            class="dropdown-item" 
            class:disabled={item.disabled}
            class:danger={item.danger}
            disabled={item.disabled}
            onclick={() => handleSelect(item)}
          >
            <div class="item-main">
              {#if item.icon}
                <span class="item-icon">{@html item.icon}</span>
              {/if}
              <span class="item-label">{item.label}</span>
            </div>
            {#if item.shortcut}
              <span class="item-shortcut">{item.shortcut}</span>
            {/if}
          </button>
        {/if}
      {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .dropdown-wrapper {
    position: relative;
    display: inline-block;
  }

  .tool-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    color: var(--color-text-muted);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
    height: 100%;
  }

  .tool-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  .tool-btn.active {
    background: var(--color-surface-active);
    color: var(--color-text);
  }

  .tool-icon {
    font-size: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .tool-icon :global(svg) {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    min-width: 180px;
    background: var(--color-dropdown-bg, var(--color-surface-hover));
    backdrop-filter: blur(var(--backdrop-blur));
    -webkit-backdrop-filter: blur(var(--backdrop-blur));
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-panel);
    border-radius: 8px;
    padding: 4px;
    display: flex;
    flex-direction: column;
    z-index: 1000;
    animation: fadeIn 0.15s ease-out forwards;
    transform-origin: top left;
  }

  .dropdown-menu.direction-up {
    top: auto;
    bottom: calc(100% + 4px);
    transform-origin: bottom left;
  }

  .dropdown-menu.align-right {
    left: auto;
    right: 0;
    transform-origin: top right;
  }
  .dropdown-menu.direction-up.align-right {
    transform-origin: bottom right;
  }

  .dropdown-menu.align-center {
    left: 50%;
    transform: translateX(-50%);
    transform-origin: top center;
  }
  .dropdown-menu.direction-up.align-center {
    transform-origin: bottom center;
  }

  .dropdown-menu.direction-up {
    animation: fadeInUp 0.15s ease-out forwards;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-5px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(5px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: var(--color-text);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.1s;
    text-align: left;
    width: 100%;
  }

  .dropdown-item:hover:not(.disabled) {
    background: var(--color-surface-hover);
  }
  
  .dropdown-item.danger:hover:not(.disabled) {
    background: rgba(239, 68, 68, 0.2);
    color: var(--color-danger);
  }

  .dropdown-item.disabled {
    color: var(--color-text-dim);
    cursor: not-allowed;
  }

  .item-main {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .item-icon {
    font-size: 14px;
    width: 16px;
    text-align: center;
  }

  .item-shortcut {
    color: var(--color-text-dim);
    font-size: 10px;
  }

  .dropdown-divider {
    height: 1px;
    background: var(--color-border);
    margin: 4px 0;
  }
</style>
