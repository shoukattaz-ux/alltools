/** Loads the interactive module for the current tool page. Each tool is its own chunk, so only the code it needs is downloaded. */
const loaders = import.meta.glob('./tools/*.ts') as Record<string, () => Promise<{ mount: (root: HTMLElement) => void }>>;

async function boot() {
  const root = document.getElementById('tool-root');
  if (!root) return;
  const load = loaders[`./tools/${root.dataset.tool}.ts`];
  try {
    if (!load) throw new Error('Tool module not found');
    const mod = await load();
    root.innerHTML = '';
    root.removeAttribute('aria-busy');
    mod.mount(root);
  } catch (err) {
    console.error(err);
    root.removeAttribute('aria-busy');
    root.innerHTML = '<div class="notice notice-error" role="alert"><span>This tool could not be loaded. Please check your connection, reload the page, and try a current version of Chrome, Edge, Firefox or Safari.</span></div>';
  }
}
boot();
