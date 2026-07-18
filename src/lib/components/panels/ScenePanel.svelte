<script lang="ts">
  import Panel from './Panel.svelte';
  import ContextMenu from '$lib/components/ui/ContextMenu.svelte';
  import { formatShortcut, matchShortcut } from '$lib/stores/shortcuts.svelte';
  import { sceneStore } from '$lib/stores/scene';
  import type { SceneManager } from '$lib/core/scene';
  import type { CameraController } from '$lib/camera/camera-controller';
  import visibleSvg from '$lib/assets/visible.svg?raw';
  import invisibleSvg from '$lib/assets/invisible.svg?raw';
  import trashSvg from '$lib/assets/trashbin.svg?raw';
  import { tick } from 'svelte';

  interface Props {
    sceneManager: SceneManager | undefined;
    cameraController: CameraController | undefined;
  }
  let { sceneManager, cameraController }: Props = $props();

  // --- Context menu state ---
  let contextMenu = $state<{ x: number; y: number; id: string } | null>(null);

  // --- Inline rename state ---
  let renamingId = $state<string | null>(null);
  let renameValue = $state('');
  let renameInputEl = $state<HTMLInputElement | undefined>();

  // --- Multi-selection + click vs double-click state ---
  let anchorId = $state<string | null>(null);          // Shift range-select anchor
  let clickTimer: ReturnType<typeof setTimeout> | null = null; // dblclick guard

  function handleItemClick(id: string, e: MouseEvent) {
    if (clickTimer) clearTimeout(clickTimer);

    const isCtrl  = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;

    clickTimer = setTimeout(() => {
      clickTimer = null;

      if (isCtrl) {
        // Ctrl: toggle this item without touching others
        if ($sceneStore.selectedIds.includes(id)) {
          sceneManager?.deselect(id);
        } else {
          sceneManager?.select(id, true); // additive
          anchorId = id;
        }
      } else if (isShift && anchorId) {
        // Shift: range-select from anchor to clicked item
        const ids = $sceneStore.objects.map(o => o.id);
        const a = ids.indexOf(anchorId);
        const b = ids.indexOf(id);
        if (a !== -1 && b !== -1) {
          const rangeIds = ids.slice(Math.min(a, b), Math.max(a, b) + 1);
          sceneManager?.selectMultiple(rangeIds, false);
        }
      } else {
        // Plain click: single select + set anchor
        sceneManager?.select(id, false);
        anchorId = id;
      }
    }, 180);
  }

  function focusObject(id: string) {
    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
    // Single-select + set anchor
    sceneManager?.select(id, false);
    anchorId = id;
    // Focus camera
    const obj = sceneManager?.getObject(id);
    if (obj && cameraController) {
      cameraController.focusOn(obj);
    }
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
      case 'light': return '💡';
      case 'model': return '📦';
      default: return '⬡';
    }
  }

  // --- Right-click context menu ---
  function openContextMenu(id: string, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    // If right-clicking an item not in the current selection, single-select it.
    // If it's already part of a multi-selection, keep the selection intact.
    if (!$sceneStore.selectedIds.includes(id)) {
      sceneManager?.select(id, false);
      anchorId = id;
    }
    contextMenu = { x: e.clientX, y: e.clientY, id };
  }

  function closeContextMenu() {
    contextMenu = null;
  }


  function getContextItems() {
    const isMulti = $sceneStore.selectedIds.length > 1;
    const items: { id: string; label: string; icon?: string; shortcut?: string; divider?: boolean; danger?: boolean }[] = [];
    if (!isMulti) {
      items.push({ id: 'rename',    label: 'Rename',    icon: '✏️', shortcut: formatShortcut('rename') });
      items.push({ id: 'duplicate', label: 'Duplicate', icon: '⧉', shortcut: formatShortcut('duplicate') });
      items.push({ id: '__div__',   label: '',          divider: true });
    }
    const n = $sceneStore.selectedIds.length;
    items.push({ id: 'delete', label: isMulti ? `Delete ${n} objects` : 'Delete', icon: '🗑️', danger: true });
    return items;
  }

  function handleContextAction(action: string) {
    const id = contextMenu?.id;
    if (!id) return;
    closeContextMenu();

    switch (action) {
      case 'rename':
        startRename(id);
        break;
      case 'duplicate':
        sceneManager?.duplicateObject(id);
        break;
      case 'delete': {
        // Delete all selected items
        const toDelete = [...$sceneStore.selectedIds];
        for (const sid of toDelete) sceneManager?.removeObject(sid);
        anchorId = null;
        break;
      }
    }
  }

  // --- Rename logic ---
  async function startRename(id: string) {
    const meta = sceneManager?.getMeta(id);
    if (!meta) return;
    renamingId = id;
    renameValue = meta.name;
    await tick();
    renameInputEl?.focus();
    renameInputEl?.select();
  }

  function commitRename() {
    if (renamingId) {
      sceneManager?.renameObject(renamingId, renameValue);
    }
    renamingId = null;
  }

  function cancelRename() {
    renamingId = null;
  }

  function handleRenameKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRename();
    }
  }

  $effect(() => {
    const handleRenameShortcut = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (matchShortcut(e, 'rename')) {
        e.preventDefault();
        const selectedIds = $sceneStore.selectedIds;
        if (selectedIds.length === 1) {
          startRename(selectedIds[0]);
        }
      }
    };
    window.addEventListener('keydown', handleRenameShortcut);
    return () => window.removeEventListener('keydown', handleRenameShortcut);
  });
</script>

<Panel title="Scene" maxHeight="250px">
  <div class="scene-list">
    {#each $sceneStore.objects as { id, meta }}
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div
        class="scene-item"
        class:selected={$sceneStore.selectedIds.includes(id)}
        title="Click to select · Ctrl+Click to toggle · Shift+Click to range · Double-click to focus"
        onclick={(e) => handleItemClick(id, e)}
        ondblclick={() => focusObject(id)}
        oncontextmenu={(e) => openContextMenu(id, e)}
      >
        <span class="scene-icon">{getIcon(meta.type)}</span>

        {#if renamingId === id}
          <!-- Inline rename input -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <input
            class="rename-input"
            bind:this={renameInputEl}
            bind:value={renameValue}
            onblur={commitRename}
            onkeydown={handleRenameKeydown}
            onclick={(e) => e.stopPropagation()}
          />
        {:else}
          <span class="scene-name">{meta.name}</span>
        {/if}

        <button
          class="vis-btn"
          class:dimmed={meta.visible === false}
          title="Toggle visibility"
          onclick={(e) => toggleVisibility(id, e)}
        >
          {#if meta.visible !== false}
            {@html visibleSvg}
          {:else}
            {@html invisibleSvg}
          {/if}
        </button>
        <button
          class="vis-btn"
          title="Delete object"
          onclick={(e) => deleteObject(id, e)}
        >
          {@html trashSvg}
        </button>
      </div>
    {/each}

    {#if $sceneStore.objects.length === 0}
      <p class="empty-hint">No objects in scene.<br>Add one from the Library.</p>
    {/if}
  </div>
</Panel>

{#if contextMenu}
  <ContextMenu
    x={contextMenu.x}
    y={contextMenu.y}
    items={getContextItems()}
    onSelect={handleContextAction}
    onClose={closeContextMenu}
  />
{/if}

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

  .rename-input {
    flex: 1;
    background: var(--color-bg);
    border: 1px solid var(--color-accent);
    border-radius: 3px;
    color: var(--color-text);
    font-size: 12px;
    font-family: inherit;
    padding: 1px 5px;
    outline: none;
    min-width: 0;
    box-shadow: 0 0 0 2px var(--color-accent-muted);
  }

  .vis-btn {
    background: none;
    border: none;
    cursor: pointer;
    opacity: 0.8;
    color: var(--color-text-muted);
    padding: 0 4px;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .vis-btn.dimmed {
    opacity: 0.15;
  }

  .vis-btn:hover {
    opacity: 1;
    color: var(--color-text);
  }

  .vis-btn :global(svg) {
    width: 14px;
    height: 14px;
    display: block;
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
