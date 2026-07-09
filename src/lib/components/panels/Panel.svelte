<script lang="ts">
  interface Props {
    title: string;
    children: import('svelte').Snippet;
    defaultCollapsed?: boolean;
    maxHeight?: string;
  }
  let { title, children, defaultCollapsed = false, maxHeight }: Props = $props();
  let collapsed = $state(defaultCollapsed);
</script>

<div class="panel">
  <button class="panel-header" onclick={() => (collapsed = !collapsed)}>
    <span class="panel-title">{title}</span>
    <span class="panel-chevron">{collapsed ? '▸' : '▾'}</span>
  </button>
  {#if !collapsed}
    <div class="panel-content" style={maxHeight ? `max-height: ${maxHeight}; overflow-y: auto;` : ''}>
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .panel {
    border-bottom: 1px solid var(--color-border);
    overflow: hidden;
    font-size: 13px;
    width: 100%;
  }

  .panel:last-child {
    border-bottom: none;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: transparent;
    border-bottom: 1px solid var(--color-border);
    cursor: pointer;
    user-select: none;
    width: 100%;
    border: none;
    color: inherit;
    font: inherit;
  }

  .panel-header:hover {
    background: var(--color-surface-hover);
  }

  .panel-title {
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--color-text);
  }

  .panel-chevron {
    color: var(--color-text-muted);
    font-size: 10px;
  }

  .panel-content {
    padding: 8px;
    scrollbar-gutter: stable;
    scrollbar-width: thin;
    scrollbar-color: var(--color-border) transparent;
  }

  /* Custom scrollbar styling for webkit */
  .panel-content::-webkit-scrollbar {
    width: 6px;
  }

  .panel-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .panel-content::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 3px;
  }

  .panel-content::-webkit-scrollbar-thumb:hover {
    background: var(--color-text-dim);
  }
</style>
