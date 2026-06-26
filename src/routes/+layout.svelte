<script>
	import './layout.css';

	/** @type {{children: import('svelte').Snippet}} */
	let { children } = $props();
</script>

<div class="app">
	<main>
		{@render children()}
	</main>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100%;
		margin: 0;
		padding: 0;
		overflow: hidden;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		padding: 0;
		margin: 0;
		overflow: hidden;
		box-sizing: border-box;
	}
</style>
