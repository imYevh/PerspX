<script lang="ts">
  import { Renderer } from '$lib/core/renderer';
  import { SceneManager } from '$lib/core/scene';
  import { RenderLoop } from '$lib/core/loop';


  let canvas: HTMLCanvasElement;

  $effect(() => {
    // Three.js will be initialized here in the next phase
    console.log('Canvas ready:', canvas);
  });
</script>

<canvas bind:this={canvas} id="viewport"></canvas>

<style>
  #viewport {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none; /* Critical for mobile — prevents browser gestures */
  }
</style>
