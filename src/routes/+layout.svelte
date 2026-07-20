<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { initTheme } from '$lib/stores/theme.svelte';
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
