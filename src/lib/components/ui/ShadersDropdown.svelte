<script lang="ts">
  import shadersIcon from '$lib/assets/shaders.svg?raw';
  import Dropdown from './Dropdown.svelte';
  import { uiStore } from '$lib/stores/ui';
  import { shaderStore, SHADER_DEFS, SHADER_ORDER, setShader, setShaderParam, initShaderPreviews, type ShaderType } from '$lib/stores/shader.svelte';
import { onMount } from 'svelte';

  interface Props {
    align?: 'left' | 'right' | 'center';
  }
  let { align = 'left' }: Props = $props();

  let isOpen = $state(false);

  $effect(() => {
    if (isOpen && shaderStore.use3DPreviews) {
      initShaderPreviews();
    }
  });

  function onShaderSelect(type: ShaderType) {
    if (shaderStore.active === type) {
      setShader('none');
    } else {
      setShader(type);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('perspx-shader-changed', {
        detail: {
          type: shaderStore.active,
          params: shaderStore.params[shaderStore.active] ?? {}
        }
      }));
    }
  }

  function onShaderParamInput(key: string, value: number) {
    setShaderParam(key, value);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('perspx-shader-params-changed', {
        detail: { params: shaderStore.params[shaderStore.active] ?? {} }
      }));
    }
  }
</script>

<Dropdown 
  icon={shadersIcon} 
  title="Procedural Shaders" 
  hideLabelOnMobile={true}
  isMobile={$uiStore.breakpoint === 'mobile'}
  direction="down"
  align={align}
  bind:isOpen={isOpen}
>
  <div class="popover-content">
    <div class="shader-grid">
      {#each SHADER_ORDER as type}
        {@const def = SHADER_DEFS[type]}
        <button
          class="shader-btn"
          class:active={shaderStore.active === type}
          onclick={() => onShaderSelect(type)}
          title={def.description}
        >
          {#if shaderStore.use3DPreviews && shaderStore.previews[type]}
            <img src={shaderStore.previews[type]} alt={def.label} class="shader-preview-img" />
          {:else}
            <span class="shader-icon" class:loading={shaderStore.use3DPreviews && shaderStore.previewsLoading}>{def.icon}</span>
          {/if}
          <span class="shader-label">{def.label}</span>
        </button>
      {/each}
    </div>

    {#if shaderStore.active !== 'none'}
      {@const activeDef = SHADER_DEFS[shaderStore.active]}
      {@const activeParams = shaderStore.params[shaderStore.active]}
      <div class="shader-params">
        {#each Object.entries(activeDef.params) as [key, paramDef]}
          <div class="sub-prop">
            <div class="sub-header">
              <span class="sub-label">{paramDef.label}</span>
              <div class="input-group">
                <button
                  class="reset-btn"
                  title="Reset to default"
                  onclick={() => onShaderParamInput(key, paramDef.default)}
                >
                  ⟲
                </button>
                <input
                  type="number"
                  min={paramDef.min}
                  max={paramDef.max}
                  step={paramDef.step}
                  value={Number(activeParams[key]).toFixed(paramDef.step < 1 ? 2 : 0)}
                  oninput={(e) => onShaderParamInput(key, parseFloat((e.target as HTMLInputElement).value))}
                  class="num-input"
                />
              </div>
            </div>
            <input
              type="range"
              min={paramDef.min}
              max={paramDef.max}
              step={paramDef.step}
              value={activeParams[key]}
              ondblclick={() => onShaderParamInput(key, paramDef.default)}
              oninput={(e) => onShaderParamInput(key, parseFloat((e.target as HTMLInputElement).value))}
              class="slider"
            />
          </div>
        {/each}
      </div>
    {/if}
  </div>
</Dropdown>

<style>
  .popover-content {
    padding: 8px;
    background: var(--color-surface);
    border-radius: 8px;
    width: max-content;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .shader-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    min-width: 220px;
  }
  @media (max-width: 400px) {
    .shader-grid {
      grid-template-columns: repeat(2, 1fr);
      min-width: 160px;
    }
  }
  .shader-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px 4px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all 0.12s;
  }
  .shader-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
    border-color: var(--color-text-muted);
  }
  .shader-btn.active {
    background: var(--color-accent-muted);
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
  .shader-icon {
    font-size: 16px;
    line-height: 1;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .shader-icon.loading {
    opacity: 0.5;
    animation: pulse 1.5s infinite;
  }
  @keyframes pulse {
    0% { opacity: 0.3; }
    50% { opacity: 0.7; }
    100% { opacity: 0.3; }
  }
  .shader-preview-img {
    width: 32px;
    height: 32px;
    object-fit: cover;
    border-radius: 4px;
    background: var(--color-bg);
  }
  .shader-label {
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
  }
  .shader-params {
    margin-top: 4px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 6px;
  }
  .sub-prop {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .sub-label {
    font-size: 11px;
    color: var(--color-text-muted);
  }
  .sub-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .input-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .reset-btn {
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    font-size: 14px;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
    border-radius: 4px;
    transition: color 0.15s, background 0.15s;
  }
  .reset-btn:hover {
    color: var(--color-text);
    background: var(--color-surface-hover);
  }
  .num-input {
    width: 50px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    border-radius: 4px;
    padding: 2px 4px;
    font-size: 11px;
    text-align: right;
    outline: none;
  }
  .num-input:focus {
    border-color: var(--color-accent);
  }
  .slider {
    width: 100%;
  }
</style>
