<script lang="ts">
  import type { TransformSystem } from '$lib/transforms/transform-controls';
  import type { ObjectManager } from '$lib/objects/object-manager';
  import { uiStore } from '$lib/stores/ui';
  import type { TransformMode } from '$lib/transforms/transform-controls';

  interface Props {
    transformSystem: TransformSystem | undefined;
    objectManager: ObjectManager | undefined;
  }
  let { transformSystem, objectManager }: Props = $props();

  const modes: { key: TransformMode; label: string; icon: string; shortcut: string }[] = [
    { key: 'translate', label: 'Move', icon: '↔', shortcut: 'G' },
    { key: 'rotate', label: 'Rotate', icon: '↻', shortcut: 'R' },
    { key: 'scale', label: 'Scale', icon: '⤢', shortcut: 'S' },
  ];

  function setMode(mode: TransformMode) {
    transformSystem?.setMode(mode);
    uiStore.update(s => ({ ...s, transformMode: mode }));
  }
</script>

<header class="toolbar">
  <div class="toolbar-brand">
    <span class="brand-logo">P</span>
    <span class="brand-name">PerspX</span>
  </div>

  <div class="toolbar-sep"></div>

  <div class="toolbar-group">
    {#each modes as mode}
      <button
        class="tool-btn"
        class:active={$uiStore.transformMode === mode.key}
        onclick={() => setMode(mode.key)}
        title="{mode.label} ({mode.shortcut})"
      >
        <span class="tool-icon">{mode.icon}</span>
        <span class="tool-label">{mode.label}</span>
      </button>
    {/each}
  </div>

  <div class="toolbar-sep"></div>

  <div class="toolbar-group">
    <button class="tool-btn" title="Undo (Ctrl+Z)" onclick={() => {}}>⟲</button>
    <button class="tool-btn" title="Redo (Ctrl+Y)" onclick={() => {}}>⟳</button>
  </div>
</header>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 12px;
    height: 44px;
    background: rgba(15, 15, 25, 0.95);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
    z-index: 20;
  }

  .toolbar-brand {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-right: 4px;
  }

  .brand-logo {
    width: 26px;
    height: 26px;
    background: linear-gradient(135deg, #4a9eff, #7b5ea7);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    font-size: 14px;
    color: white;
  }

  .brand-name {
    font-size: 15px;
    font-weight: 700;
    color: #e0e0e0;
    letter-spacing: -0.3px;
  }

  .toolbar-sep {
    width: 1px;
    height: 24px;
    background: rgba(255, 255, 255, 0.1);
    margin: 0 4px;
  }

  .toolbar-group {
    display: flex;
    gap: 2px;
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
  }

  .tool-btn:hover {
    background: rgba(255, 255, 255, 0.07);
    color: #e0e0e0;
  }

  .tool-btn.active {
    background: rgba(74, 158, 255, 0.15);
    border-color: rgba(74, 158, 255, 0.4);
    color: #4a9eff;
  }

  .tool-icon {
    font-size: 14px;
  }
</style>
