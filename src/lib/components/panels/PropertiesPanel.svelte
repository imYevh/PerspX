<script lang="ts">
  import Panel from './Panel.svelte';
  import ScrubInput from './ScrubInput.svelte';
  import { sceneStore } from '$lib/stores/scene';
  import type { SceneManager } from '$lib/core/scene';
  import { MathUtils } from 'three';
  import { commitHistory } from '$lib/stores/history';

  interface Props {
    sceneManager: SceneManager | undefined;
  }
  let { sceneManager }: Props = $props();

  // Force re-renders every frame to show live updates from gizmos
  let tick = $state(0);
  $effect(() => {
    let frame = requestAnimationFrame(function loop() {
      tick++;
      frame = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(frame);
  });

  let uniformScale = $state(false);

  let selectedId = $derived($sceneStore.selectedIds[0] ?? null);
  let selectedCount = $derived($sceneStore.selectedIds.length);
  
  let selectedEntry = $derived(
    selectedId ? $sceneStore.objects.find(o => o.id === selectedId) : null
  );

  const typeCounts = $derived.by(() => {
    const counts: Record<string, number> = {};
    for (const id of $sceneStore.selectedIds) {
      const obj = $sceneStore.objects.find(o => o.id === id);
      if (obj) {
        counts[obj.meta.type] = (counts[obj.meta.type] || 0) + 1;
      }
    }
    return counts;
  });

  function deselectByType(type: string) {
    if (!sceneManager) return;
    const currentIds = sceneManager.getSelectedIds();
    const newIds = currentIds.filter(id => {
      const meta = sceneManager.getMeta(id);
      return meta?.type !== type;
    });
    sceneManager.selectMultiple(newIds, false);
  }

  function setPosition(axis: 'x' | 'y' | 'z', value: string) {
    const obj = sceneManager?.getObject(selectedId!);
    if (obj) {
      const val = parseFloat(value);
      obj.position[axis] = isNaN(val) ? 0 : val;
    }
  }

  function setRotation(axis: 'x' | 'y' | 'z', value: string) {
    const obj = sceneManager?.getObject(selectedId!);
    if (obj) {
      const val = parseFloat(value);
      obj.rotation[axis] = MathUtils.degToRad(isNaN(val) ? 0 : val);
    }
  }

  function setScale(axis: 'x' | 'y' | 'z', value: string) {
    const obj = sceneManager?.getObject(selectedId!);
    if (obj) {
      const val = parseFloat(value);
      const safeVal = isNaN(val) ? 1 : val;
      if (uniformScale) {
        obj.scale.set(safeVal, safeVal, safeVal);
      } else {
        obj.scale[axis] = safeVal;
      }
    }
  }

  function resetPosition() {
    const obj = sceneManager?.getObject(selectedId!);
    if (obj) obj.position.set(0, 0.5, 0);
  }

  function resetRotation() {
    const obj = sceneManager?.getObject(selectedId!);
    if (obj) obj.rotation.set(0, 0, 0);
  }

  function resetScale() {
    const obj = sceneManager?.getObject(selectedId!);
    if (obj) obj.scale.set(1, 1, 1);
  }

  function setIntensity(value: string) {
    const obj = sceneManager?.getObject(selectedId!);
    if (obj && 'intensity' in obj) {
      (obj as any).intensity = parseFloat(value) || 1;
    }
  }

  function setColor(value: string) {
    const obj = sceneManager?.getObject(selectedId!);
    if (obj && 'color' in obj) {
      (obj as any).color.set(value);
    }
  }

  function setName(value: string) {
    const meta = sceneManager?.getMeta(selectedId!);
    if (meta) meta.name = value;
  }

  function commit() {
    if (sceneManager) commitHistory(sceneManager);
  }

  function fmt(n: number) {
    return n.toFixed(2);
  }
</script>

<Panel title="Properties">
  {#if selectedCount > 1}
    <div class="prop-section">
      <div class="prop-title">Multiple Selection</div>
      <div class="prop-row" style="margin-bottom: 12px; color: #aaa;">
        <span>{selectedCount} items selected</span>
      </div>
      
      <div class="prop-title">Filters</div>
      <div class="filter-actions">
        {#each Object.entries(typeCounts) as [type, count]}
          <button class="pi filter-btn" onclick={() => deselectByType(type)}>
            Deselect {type}s ({count})
          </button>
        {/each}
      </div>
    </div>
  {:else if selectedEntry}
    {@const _t = tick}
    {@const obj = selectedEntry.object}
    {@const meta = selectedEntry.meta}

    <div class="prop-section">
      <div class="prop-title">📐 Transform</div>

      <div class="prop-row">
        <label>
          Position
          <button class="reset-btn" onclick={resetPosition} title="Reset Position">⟲</button>
        </label>
        <div class="xyz">
          <ScrubInput class="pi x" step={0.1} {tick} getValue={() => obj.position.x}
            oninput={(v) => setPosition('x', v.toString())} onchange={commit} />
          <ScrubInput class="pi y" step={0.1} {tick} getValue={() => obj.position.y}
            oninput={(v) => setPosition('y', v.toString())} onchange={commit} />
          <ScrubInput class="pi z" step={0.1} {tick} getValue={() => obj.position.z}
            oninput={(v) => setPosition('z', v.toString())} onchange={commit} />
        </div>
      </div>

      <div class="prop-row">
        <label>
          Rotation °
          <button class="reset-btn" onclick={resetRotation} title="Reset Rotation">⟲</button>
        </label>
        <div class="xyz">
          <ScrubInput class="pi x" step={1} {tick} getValue={() => MathUtils.radToDeg(obj.rotation.x)}
            oninput={(v) => setRotation('x', v.toString())} onchange={commit} />
          <ScrubInput class="pi y" step={1} {tick} getValue={() => MathUtils.radToDeg(obj.rotation.y)}
            oninput={(v) => setRotation('y', v.toString())} onchange={commit} />
          <ScrubInput class="pi z" step={1} {tick} getValue={() => MathUtils.radToDeg(obj.rotation.z)}
            oninput={(v) => setRotation('z', v.toString())} onchange={commit} />
        </div>
      </div>

      <div class="prop-row">
        <label>
          Scale
          <button class="reset-btn" onclick={resetScale} title="Reset Scale">⟲</button>
          <button class="link-btn {uniformScale ? 'active' : ''}" onclick={() => uniformScale = !uniformScale} title="Uniform Scale">
            {uniformScale ? 'L' : 'U'}
          </button>

        </label>
        <div class="xyz">
          <ScrubInput class="pi" step={0.1} {tick} getValue={() => obj.scale.x}
            oninput={(v) => setScale('x', v.toString())} onchange={commit} />
          <ScrubInput class="pi" step={0.1} {tick} getValue={() => obj.scale.y}
            oninput={(v) => setScale('y', v.toString())} onchange={commit} />
          <ScrubInput class="pi" step={0.1} {tick} getValue={() => obj.scale.z}
            oninput={(v) => setScale('z', v.toString())} onchange={commit} />
        </div>
      </div>
    </div>

    <div class="prop-section">
      <div class="prop-title">🎨 Object</div>
      <div class="prop-row">
        <label>Name</label>
        <input class="pi full" type="text" value={meta.name}
          oninput={(e) => setName((e.target as HTMLInputElement).value)} onchange={commit} />
      </div>
      <div class="prop-row">
        <label>Type</label>
        <span class="prop-badge">{meta.type}</span>
      </div>

      {#if 'intensity' in obj}
        <div class="prop-row">
          <label>Intensity</label>
          <ScrubInput class="pi full" step={0.1} {tick} getValue={() => (obj as any).intensity}
            oninput={(v) => setIntensity(v.toString())} onchange={commit} />
        </div>
      {/if}

      {#if 'color' in obj}
        <div class="prop-row">
          <label>Color</label>
          <input class="pi full" type="color" value={"#" + (obj as any).color.getHexString()}
            oninput={(e) => setColor((e.target as HTMLInputElement).value)} onchange={commit}
            style="padding: 0 4px; height: 22px; cursor: pointer;" />
        </div>
      {/if}
    </div>
  {:else}
    <p class="empty-hint">Select an object to see its properties.</p>
  {/if}
</Panel>

<style>
  .prop-section {
    margin-bottom: 12px;
  }

  .prop-title {
    font-size: 10px;
    font-weight: 700;
    color: var(--color-text-dim);
    text-transform: uppercase;
    letter-spacing: 0.7px;
    margin-bottom: 8px;
  }

  .prop-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 5px;
  }

  label {
    font-size: 11px;
    color: var(--color-text-muted);
    width: 90px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .link-btn {
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: 11px;
    padding: 2px 4px;
    border-radius: 4px;
    margin-left: auto;
  }
  .link-btn:hover { color: var(--color-text); background: var(--color-surface-hover); }
  .link-btn.active { color: var(--color-accent); }

  .reset-btn {
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: 14px;
    padding: 0px 4px;
    border-radius: 4px;
    margin-left: 4px;
    transition: all 0.2s;
  }
  .reset-btn:hover { color: var(--color-text); background: var(--color-surface-hover); }

  .xyz {
    display: flex;
    gap: 3px;
    flex: 1;
  }

  :global(.pi) {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text);
    padding: 4px 6px;
    font-size: 11px;
    width: 100%;
    /* Fix input shrinking flex layout */
    min-width: 0; 
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
  }

  :global(.pi:focus) {
    border-color: var(--color-accent);
    outline: none;
    background: var(--color-accent-muted);
  }

  :global(.pi.x) { border-left: 2px solid #ff5555; }
  :global(.pi.y) { border-left: 2px solid #55cc55; }
  :global(.pi.z) { border-left: 2px solid #5555ff; }
  :global(.pi.full) { flex: 1; }

  .prop-badge {
    font-size: 11px;
    color: var(--color-text-muted);
    background: var(--color-bg);
    padding: 2px 8px;
    border-radius: 10px;
    font-family: monospace;
    border: 1px solid var(--color-border);
  }

  .empty-hint {
    font-size: 11px;
    color: var(--color-text-muted);
    text-align: center;
    padding: 16px 0;
    margin: 0;
  }

  .filter-actions {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .filter-btn {
    cursor: pointer;
    text-align: left;
    transition: background 0.2s, border-color 0.2s;
  }
  
  .filter-btn:hover {
    background: rgba(255, 85, 85, 0.15);
    border-color: rgba(255, 85, 85, 0.4);
    color: #ffaaaa;
  }
</style>
