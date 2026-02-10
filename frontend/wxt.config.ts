import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: "Rae - Resume Autofill Extension",
    description: "Automatically fill job applications using your resume data.",
    permissions: ['storage', 'tabs', 'sidePanel'],
    
    side_panel: {
      default_path: 'sidepanel.html', 
    },
    action: {
      default_title: "Open Rae"
    }
  },
});