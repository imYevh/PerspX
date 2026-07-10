<script lang="ts">
  import Panel from './Panel.svelte';
  import { sceneStore } from '$lib/stores/scene';
  import type { SceneManager } from '$lib/core/scene';

  interface Props {
    sceneManager: SceneManager | undefined;
  }
  let { sceneManager }: Props = $props();

  function selectObject(id: string, additive: boolean) {
    sceneManager?.select(id, additive);
  }

  function toggleVisibility(id: string, e: MouseEvent) {
    e.stopPropagation();
    const obj = sceneManager?.getObject(id);
    const meta = sceneManager?.getMeta(id);
    if (obj && meta) {
      obj.visible = !obj.visible;
      meta.visible = obj.visible;
      sceneStore.update(s => s);
    }
  }

  function deleteObject(id: string, e: MouseEvent) {
    e.stopPropagation();
    sceneManager?.removeObject(id);
  }

  function getIcon(type: string): string {
    switch (type) {
      case 'light': return '';
      case 'model': return '';
      default: return '';
    }
  }
</script>

<Panel title="Scene" maxHeight="250px">
  <div class="scene-list">
    {#each $sceneStore.objects as { id, meta }}
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div
        class="scene-item"
        class:selected={$sceneStore.selectedIds.includes(id)}
        onclick={(e) => selectObject(id, e.shiftKey)}
      >
        <span class="scene-icon">{getIcon(meta.type)}</span>
        <span class="scene-name">{meta.name}</span>
        <button
          class="vis-btn"
          class:dimmed={meta.visible === false}
          title="Toggle visibility"
          onclick={(e) => toggleVisibility(id, e)}
        >
          {meta.visible !== false ? 'V' : '-'}
        </button>
        <button
          class="vis-btn"
          title="Delete object"
          onclick={(e) => deleteObject(id, e)}
        >
          X
        </button>
      </div>
    {/each}

    {#if $sceneStore.objects.length === 0}
      <p class="empty-hint">No objects in scene.<br>Add one from the Library.</p>
    {/if}
  </div>
</Panel>

<style>
  .scene-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .scene-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.12s;
    width: 100%;
    background: transparent;
    border: 1px solid transparent;
    color: var(--color-text-muted);
    font-size: 13px;
    user-select: none;
  }

  .scene-item:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  .scene-item.selected {
    background: var(--color-surface-active);
    border-color: var(--color-accent);
    color: var(--color-text);
  }

  .scene-icon {
    font-size: 14px;
    flex-shrink: 0;
  }

  .scene-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
  }

  .vis-btn {
    background: none;
    border: none;
    cursor: pointer;
    opacity: 0.8;
    color: var(--color-text-muted);
    font-size: 12px;
    padding: 0 2px;
    transition: all 0.15s;
  }

  .vis-btn.dimmed {
    opacity: 0.15;
  }

  .vis-btn:hover {
    opacity: 1;
    color: var(--color-text);
  }

  .empty-hint {
    font-size: 11px;
    color: #666;
    text-align: center;
    padding: 12px 0;
    line-height: 1.6;
    margin: 0;
  }
</style>
