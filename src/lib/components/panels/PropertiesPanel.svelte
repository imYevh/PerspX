<script lang="ts">
  import Panel from './Panel.svelte';
  import { sceneStore } from '$lib/stores/scene';
  import type { SceneManager } from '$lib/core/scene';
  import { MathUtils } from 'three';

  interface Props {
    sceneManager: SceneManager | undefined;
  }
  let { sceneManager }: Props = $props();

  let selectedId = $derived($sceneStore.selectedIds[0] ?? null);
  let selectedEntry = $derived(
    selectedId ? $sceneStore.objects.find(o => o.id === selectedId) : null
  );

  function setPosition(axis: 'x' | 'y' | 'z', value: string) {
    const obj = sceneManager?.getObject(selectedId!);
    if (obj) obj.position[axis] = parseFloat(value) || 0;
  }

  function setRotation(axis: 'x' | 'y' | 'z', value: string) {
    const obj = sceneManager?.getObject(selectedId!);
    if (obj) obj.rotation[axis] = MathUtils.degToRad(parseFloat(value) || 0);
  }

  function setScale(axis: 'x' | 'y' | 'z', value: string) {
    const obj = sceneManager?.getObject(selectedId!);
    if (obj) obj.scale[axis] = parseFloat(value) || 1;
  }

  function setName(value: string) {
    const meta = sceneManager?.getMeta(selectedId!);
    if (meta) meta.name = value;
  }

  function fmt(n: number) {
    return n.toFixed(2);
  }
</script>

<Panel title="⚙️ Properties">
  {#if selectedEntry}
    {@const obj = selectedEntry.object}
    {@const meta = selectedEntry.meta}

    <div class="prop-section">
      <div class="prop-title">📐 Transform</div>

      <div class="prop-row">
        <label>Position</label>
        <div class="xyz">
          <input class="pi x" type="number" step="0.1" value={fmt(obj.position.x)}
            onchange={(e) => setPosition('x', (e.target as HTMLInputElement).value)} />
          <input class="pi y" type="number" step="0.1" value={fmt(obj.position.y)}
            onchange={(e) => setPosition('y', (e.target as HTMLInputElement).value)} />
          <input class="pi z" type="number" step="0.1" value={fmt(obj.position.z)}
            onchange={(e) => setPosition('z', (e.target as HTMLInputElement).value)} />
        </div>
      </div>

      <div class="prop-row">
        <label>Rotation °</label>
        <div class="xyz">
          <input class="pi x" type="number" step="1" value={MathUtils.radToDeg(obj.rotation.x).toFixed(0)}
            onchange={(e) => setRotation('x', (e.target as HTMLInputElement).value)} />
          <input class="pi y" type="number" step="1" value={MathUtils.radToDeg(obj.rotation.y).toFixed(0)}
            onchange={(e) => setRotation('y', (e.target as HTMLInputElement).value)} />
          <input class="pi z" type="number" step="1" value={MathUtils.radToDeg(obj.rotation.z).toFixed(0)}
            onchange={(e) => setRotation('z', (e.target as HTMLInputElement).value)} />
        </div>
      </div>

      <div class="prop-row">
        <label>Scale</label>
        <div class="xyz">
          <input class="pi" type="number" step="0.1" value={fmt(obj.scale.x)}
            onchange={(e) => setScale('x', (e.target as HTMLInputElement).value)} />
          <input class="pi" type="number" step="0.1" value={fmt(obj.scale.y)}
            onchange={(e) => setScale('y', (e.target as HTMLInputElement).value)} />
          <input class="pi" type="number" step="0.1" value={fmt(obj.scale.z)}
            onchange={(e) => setScale('z', (e.target as HTMLInputElement).value)} />
        </div>
      </div>
    </div>

    <div class="prop-section">
      <div class="prop-title">🎨 Object</div>
      <div class="prop-row">
        <label>Name</label>
        <input class="pi full" type="text" value={meta.name}
          onchange={(e) => setName((e.target as HTMLInputElement).value)} />
      </div>
      <div class="prop-row">
        <label>Type</label>
        <span class="prop-badge">{meta.type}</span>
      </div>
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
    color: #666;
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
    color: #888;
    min-width: 60px;
    flex-shrink: 0;
  }

  .xyz {
    display: flex;
    gap: 3px;
    flex: 1;
  }

  .pi {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    color: #e0e0e0;
    padding: 4px 6px;
    font-size: 11px;
    width: 100%;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
  }

  .pi:focus {
    border-color: #4a9eff;
    outline: none;
    background: rgba(74, 158, 255, 0.08);
  }

  .pi.x { border-left: 2px solid #ff5555; }
  .pi.y { border-left: 2px solid #55cc55; }
  .pi.z { border-left: 2px solid #5555ff; }
  .pi.full { flex: 1; }

  .prop-badge {
    font-size: 11px;
    color: #888;
    background: rgba(255,255,255,0.06);
    padding: 2px 8px;
    border-radius: 10px;
    font-family: monospace;
  }

  .empty-hint {
    font-size: 11px;
    color: #555;
    text-align: center;
    padding: 16px 0;
    margin: 0;
  }
</style>
