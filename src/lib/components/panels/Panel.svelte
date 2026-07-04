<script lang="ts">
  interface Props {
    title: string;
    children: import('svelte').Snippet;
    defaultCollapsed?: boolean;
  }
  let { title, children, defaultCollapsed = false }: Props = $props();
  let collapsed = $state(defaultCollapsed);
</script>

<div class="panel">
  <button class="panel-header" onclick={() => (collapsed = !collapsed)}>
    <span class="panel-title">{title}</span>
    <span class="panel-chevron">{collapsed ? '▸' : '▾'}</span>
  </button>
  {#if !collapsed}
    <div class="panel-content">
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .panel {
    background: rgba(20, 20, 30, 0.92);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    overflow: hidden;
    font-size: 13px;
    width: 100%;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.04);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    cursor: pointer;
    user-select: none;
    width: 100%;
    border: none;
    color: inherit;
    font: inherit;
  }

  .panel-header:hover {
    background: rgba(255, 255, 255, 0.07);
  }

  .panel-title {
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #ccc;
  }

  .panel-chevron {
    color: #666;
    font-size: 10px;
  }

  .panel-content {
    padding: 8px;
    max-height: 400px;
    overflow-y: auto;
  }
</style>
