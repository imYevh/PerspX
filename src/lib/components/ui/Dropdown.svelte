<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

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
    items: DropdownItem[];
    onSelect: (id: string) => void;
    hideLabelOnMobile?: boolean;
    isMobile?: boolean;
  }

  let { 
    icon, 
    label, 
    title, 
    items, 
    onSelect,
    hideLabelOnMobile = false,
    isMobile = false
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
    onSelect(item.id);
  }

  function handleClickOutside(e: MouseEvent) {
    if (isOpen && dropdownRef && !dropdownRef.contains(e.target as Node)) {
      isOpen = false;
    }
  }

  onMount(() => {
    document.addEventListener('mousedown', handleClickOutside);
  });

  onDestroy(() => {
    document.removeEventListener('mousedown', handleClickOutside);
  });
</script>

<div class="dropdown-wrapper" bind:this={dropdownRef}>
  <button class="tool-btn" {title} onclick={toggle} class:active={isOpen}>
    {#if icon}
      <span class="tool-icon">{icon}</span>
    {/if}
    {#if label}
      {#if !(hideLabelOnMobile && isMobile)}
        <span class="tool-label">{label}</span>
      {/if}
    {/if}
  </button>

  {#if isOpen}
    <div class="dropdown-menu glass">
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
                <span class="item-icon">{item.icon}</span>
              {/if}
              <span class="item-label">{item.label}</span>
            </div>
            {#if item.shortcut}
              <span class="item-shortcut">{item.shortcut}</span>
            {/if}
          </button>
        {/if}
      {/each}
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
    color: #aaa;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
    height: 100%;
  }

  .tool-btn:hover {
    background: rgba(255, 255, 255, 0.07);
    color: #e0e0e0;
  }

  .tool-btn.active {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .tool-icon {
    font-size: 14px;
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    min-width: 180px;
    border-radius: 8px;
    padding: 4px;
    display: flex;
    flex-direction: column;
    z-index: 1000;
    animation: fadeIn 0.15s ease-out forwards;
    transform-origin: top left;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-5px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
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
    color: #e0e0e0;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.1s;
    text-align: left;
    width: 100%;
  }

  .dropdown-item:hover:not(.disabled) {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .dropdown-item.danger:hover:not(.disabled) {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }

  .dropdown-item.disabled {
    color: #666;
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
    color: #666;
    font-size: 10px;
  }

  .dropdown-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
    margin: 4px 0;
  }
</style>
