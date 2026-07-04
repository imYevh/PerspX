<script lang="ts">
  import { cameraStore } from '$lib/stores/camera';
  import { sceneStore } from '$lib/stores/scene';
  import { uiStore } from '$lib/stores/ui';
  import { fovToFocalLength } from '$lib/camera/camera-presets';

  const modeLabel = $derived(
    $cameraStore.mode === 'perspective' ? '🔭 Persp' : '📐 Ortho'
  );
  const focalLen = $derived(fovToFocalLength($cameraStore.fov).toFixed(0));
  const selectedName = $derived(() => {
    if ($sceneStore.selectedIds.length === 0) return null;
    const id = $sceneStore.selectedIds[0];
    return $sceneStore.objects.find(o => o.id === id)?.meta.name ?? null;
  });

  const marqueeStyle = $derived(() => {
    const { startX, startY, currentX, currentY } = $uiStore.marquee;
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    return `left: ${left}px; top: ${top}px; width: ${width}px; height: ${height}px;`;
  });
</script>

{#if $uiStore.marquee.active}
  <div class="marquee-box" style={marqueeStyle()}></div>
{/if}

<div class="hud">
  <span class="hud-item">{modeLabel}</span>
  <span class="hud-sep">|</span>
  <span class="hud-item">FOV: {$cameraStore.fov.toFixed(0)}°</span>
  <span class="hud-sep">|</span>
  <span class="hud-item">~{focalLen}mm</span>
  {#if $sceneStore.selectedIds.length > 0}
    <span class="hud-sep">|</span>
    <span class="hud-item hud-selected">
      ✦ {$sceneStore.selectedIds.length === 1
        ? ($sceneStore.objects.find(o => o.id === $sceneStore.selectedIds[0])?.meta.name ?? 'Object')
        : `${$sceneStore.selectedIds.length} selected`}
      — {$uiStore.transformMode}
    </span>
  {/if}
</div>

<style>
  .hud {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 18px;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 12px;
    color: #aaa;
    user-select: none;
    pointer-events: none;
    white-space: nowrap;
    z-index: 10;
  }

  .hud-sep {
    color: #444;
  }

  .hud-selected {
    color: #4a9eff;
    font-weight: 500;
  }

  .marquee-box {
    position: absolute;
    border: 1px solid rgba(74, 158, 255, 0.8);
    background: rgba(74, 158, 255, 0.15);
    pointer-events: none;
    z-index: 20;
  }
</style>
