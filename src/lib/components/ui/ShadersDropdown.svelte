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
    if (isOpen && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('perspx-shader-menu-opened'));
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
  @media (max-width: 768px) and (orientation: portrait) {
    .shader-grid {
      grid-template-columns: repeat(4, 1fr);
      min-width: 320px;
    }
  }
  @media (max-width: 950px) and (orientation: landscape) {
    .shader-grid {
      grid-template-columns: repeat(8, 1fr);
      min-width: 560px;
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

</style>
