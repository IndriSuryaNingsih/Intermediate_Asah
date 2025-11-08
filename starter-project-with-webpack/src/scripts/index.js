// CSS imports
import '../styles/styles.css';

import App from './pages/app';

document.addEventListener('DOMContentLoaded', async () => {
  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
  });
  
  // Initial page load (skip transition for faster load)
  await app.renderPage(true);
  
  // Handle hash change for SPA navigation
  window.addEventListener('hashchange', async () => {
    await app.renderPage();
  });
  
  // Prevent any form submission that might cause page reload
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (form.tagName === 'FORM' && !form.hasAttribute('data-allow-reload')) {
      // Forms should handle their own submission via JavaScript
      // Only prevent if it's not explicitly allowed to reload
      const action = form.getAttribute('action');
      if (!action || action.startsWith('#')) {
        e.preventDefault();
      }
    }
  });
});
