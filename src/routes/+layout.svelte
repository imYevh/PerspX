<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { initTheme, themeStore } from '$lib/stores/theme.svelte';
	import { StatusBar } from '@capacitor/status-bar';
	import { Capacitor } from '@capacitor/core';

	let { children } = $props();

	onMount(() => {
		initTheme();
		if (Capacitor.isNativePlatform()) {
			StatusBar.hide().catch(console.error);
		}
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}

{#if themeStore.nightMode}
	<div 
		style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 999999; background: rgba(255, 170, 0, {themeStore.nightModeIntensity / 100 * 0.4}); mix-blend-mode: multiply;"
	></div>
{/if}
