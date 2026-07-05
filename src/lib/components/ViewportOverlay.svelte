<script lang="ts">
  import { uiStore } from '$lib/stores/ui';

  const marqueeStyle = $derived(
    `left: ${Math.min($uiStore.marquee.startX, $uiStore.marquee.currentX)}px; ` +
    `top: ${Math.min($uiStore.marquee.startY, $uiStore.marquee.currentY)}px; ` +
    `width: ${Math.abs($uiStore.marquee.currentX - $uiStore.marquee.startX)}px; ` +
    `height: ${Math.abs($uiStore.marquee.currentY - $uiStore.marquee.startY)}px;`
  );
</script>

{#if $uiStore.marquee.active}
  <div class="marquee-box" style={marqueeStyle}></div>
{/if}

<style>
  .marquee-box {
    position: fixed;
    border: 1px solid rgba(74, 158, 255, 0.8);
    background: rgba(74, 158, 255, 0.15);
    pointer-events: none;
    z-index: 20;
  }
</style>
