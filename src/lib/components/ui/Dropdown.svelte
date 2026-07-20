<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import type { Snippet } from 'svelte';

  export interface DropdownItem {
    id: string;
    label: string;
    icon?: string;
    shortcut?: string;
    disabled?: boolean;
    divider?: boolean;
    header?: boolean;
    danger?: boolean;
    keepOpenOnClick?: boolean;
    type?: 'checkbox';
    checked?: boolean;
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
    isOpen?: boolean;
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
    isOpen = $bindable(false),
    children
  }: Props = $props();

  let triggerRef: HTMLButtonElement | undefined = $state();
  let menuEl: HTMLDivElement | undefined = $state();

  // Portal menu position
  let menuStyle = $state('');

  function computePosition() {
    if (!triggerRef) return;
    const r = triggerRef.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Use actual rendered width if available, else fallback
    const menuWidth = menuEl ? menuEl.offsetWidth : 180;

    let top: number, left: number;

    if (direction === 'up') {
      top = r.top - 4;
    } else {
      top = r.bottom + 4;
    }

    if (align === 'right') {
      left = r.right - menuWidth;
    } else if (align === 'center') {
      left = r.left + r.width / 2 - menuWidth / 2;
    } else {
      left = r.left;
    }

    // Clamp so menu stays on screen
    left = Math.max(8, Math.min(left, vw - menuWidth - 8));

    if (direction === 'up') {
      menuStyle = `bottom: ${vh - r.top + 4}px; left: ${left}px; max-height: ${r.top - 12}px;`;
    } else {
      menuStyle = `top: ${top}px; left: ${left}px; max-height: ${vh - top - 8}px;`;
    }
  }

  async function toggle() {
    isOpen = !isOpen;
    if (isOpen) {
      await tick();
      computePosition();
      // Re-clamp after content renders and we know the real width
      await tick();
      computePosition();
    }
  }

  function handleSelect(item: DropdownItem) {
    if (item.disabled || item.divider) return;
    if (!item.keepOpenOnClick) isOpen = false;
    if (onSelect) onSelect(item.id);
  }

  // Svelte action: moves the node to document.body (true DOM portal)
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        if (node.parentNode) node.parentNode.removeChild(node);
      }
    };
  }

  function handleClickOutside(e: PointerEvent) {
    if (!isOpen) return;
    const target = e.target as Node;
    if (triggerRef?.contains(target)) return;
    if (menuEl?.contains(target)) return;
    isOpen = false;
  }

  function handleScrollResize() {
    if (isOpen) computePosition();
  }

  onMount(() => {
    document.addEventListener('pointerdown', handleClickOutside, true);
    window.addEventListener('scroll', handleScrollResize, true);
    window.addEventListener('resize', handleScrollResize);
  });

  onDestroy(() => {
    document.removeEventListener('pointerdown', handleClickOutside, true);
    window.removeEventListener('scroll', handleScrollResize, true);
    window.removeEventListener('resize', handleScrollResize);
  });
</script>

<button class="tool-btn" bind:this={triggerRef} {title} onclick={toggle} class:active={isOpen}>
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
  <!-- Portal: physically moved to <body> to escape WebGL canvas compositing -->
  <div
    use:portal
    bind:this={menuEl}
    class="dropdown-menu"
    class:direction-up={direction === 'up'}
    class:align-right={align === 'right'}
    class:align-center={align === 'center'}
    style={menuStyle}
  >
    {#if children}
      {@render children()}
    {:else if items}
      {#each items as item}
        {#if item.header}
          <div class="dropdown-header">{item.label}</div>
        {:else if item.divider}
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
              {#if item.type === 'checkbox'}
                <span class="item-icon">
                  <input type="checkbox" checked={item.checked} tabindex="-1" style="pointer-events: none;" />
                </span>
              {:else if item.icon}
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

<style>
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
    position: fixed;
    min-width: 180px;
    max-width: calc(100vw - 16px);
    max-height: calc(100dvh - 80px);
    overflow-y: auto;
    background: var(--color-dropdown-bg, var(--color-surface-hover));
    backdrop-filter: blur(var(--backdrop-blur));
    -webkit-backdrop-filter: blur(var(--backdrop-blur));
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-panel);
    border-radius: 8px;
    padding: 4px;
    display: flex;
    flex-direction: column;
    z-index: 9999;
    animation: fadeIn 0.15s ease-out forwards;
    transform-origin: top left;
  }

  .dropdown-menu.direction-up {
    transform-origin: bottom left;
  }

  .dropdown-menu.align-right {
    transform-origin: top right;
  }
  .dropdown-menu.direction-up.align-right {
    transform-origin: bottom right;
  }

  .dropdown-menu.align-center {
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
    height: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .item-icon :global(svg) {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }

  .item-shortcut {
    color: var(--color-text-dim);
    font-size: 10px;
  }

  @media (max-width: 768px) {
    .item-shortcut {
      display: none;
    }
  }

  .dropdown-divider {
    height: 1px;
    background: var(--color-border);
    margin: 4px 0;
  }

  .dropdown-header {
    padding: 6px 8px 2px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--color-text-muted);
    letter-spacing: 0.5px;
  }
</style>
