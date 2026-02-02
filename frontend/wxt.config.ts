import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['storage', 'tabs', 'sidePanel'], 
    name: "Rae - Resume Autofill Extension",
    side_panel: {
    
      default_path: 'sidepanel/index.html', 
    },
  },
});