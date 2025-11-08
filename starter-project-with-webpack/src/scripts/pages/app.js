import routes from '../routes/routes';
import { getActiveRoute } from '../routes/url-parser';
import pushNotification from '../utils/push-notification';

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;
    this.deferredPrompt = null;

    this._setupDrawer();
    this._setupNavigation();
    this._setupSkipToContent();
    this._registerServiceWorker();
    this._setupPushNotification();
    this._setupInstallPrompt();
  }

  _setupDrawer() {
    if (!this.#drawerButton) return;

    this.#drawerButton.addEventListener('click', () => {
      const isOpen = this.#navigationDrawer.classList.toggle('open');
      this.#drawerButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    this.#drawerButton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.#drawerButton.click();
      }
    });

    document.body.addEventListener('click', (event) => {
      if (!this.#navigationDrawer.contains(event.target) && !this.#drawerButton.contains(event.target)) {
        this.#navigationDrawer.classList.remove('open');
        this.#drawerButton.setAttribute('aria-expanded', 'false');
      }

      this.#navigationDrawer.querySelectorAll('a').forEach((link) => {
        if (link.contains(event.target)) {
          this.#navigationDrawer.classList.remove('open');
          this.#drawerButton.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  _setupSkipToContent() {
    const skipLink = document.querySelector('.skip-to-content');
    if (!skipLink || !this.#content) return;

    skipLink.addEventListener('click', function(event) {
      event.preventDefault(); // Mencegah refresh halaman
      skipLink.blur(); // Menghilangkan fokus skip to content
      const mainContent = document.querySelector('#main-content');
      if (mainContent) {
        mainContent.focus(); // Fokus ke konten utama
        mainContent.scrollIntoView({ behavior: 'smooth' }); // Halaman scroll ke konten utama
      }
    });
  }

  _setupNavigation() {
    this._updateNavigation();
    this._setupLinkHandlers();
    
    // Update navigation on hash change
    window.addEventListener('hashchange', () => {
      this._updateNavigation();
    });
  }

  _setupLinkHandlers() {
    // Prevent default behavior on all internal links to ensure SPA behavior
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (link && link.getAttribute('href')?.startsWith('#')) {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href && window.location.hash !== href) {
          window.location.hash = href;
        }
      }
    }, true);
  }

  _updateNavigation() {
    const isLoggedIn = !!localStorage.getItem('token');
    const loginLink = document.getElementById('login-link');
    const registerLink = document.getElementById('register-link');
    const logoutLink = document.getElementById('logout-link');
    const addStoryLink = document.getElementById('add-story-link');
    const favoritesLink = document.getElementById('favorites-link');

    if (loginLink) loginLink.style.display = isLoggedIn ? 'none' : 'block';
    if (registerLink) registerLink.style.display = isLoggedIn ? 'none' : 'block';
    if (favoritesLink) favoritesLink.style.display = isLoggedIn ? 'block' : 'none';
    if (logoutLink) {
      logoutLink.style.display = isLoggedIn ? 'block' : 'none';
      if (isLoggedIn) {
        // Remove existing listeners to avoid duplicates
        const newLogoutLink = logoutLink.cloneNode(true);
        logoutLink.parentNode.replaceChild(newLogoutLink, logoutLink);
        
        newLogoutLink.addEventListener('click', async (e) => {
          e.preventDefault();
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // Use SPA navigation instead of reload
          window.location.hash = '#/login';
          // Trigger page render without reload
          await this.renderPage();
        });
      }
    }

    // Setup push notification when user logs in
    if (isLoggedIn) {
      this._setupPushNotification();
    }
  }

  async renderPage(isInitialLoad = false) {
    const url = getActiveRoute();
    const page = routes[url];

    if (!page) {
      this.#content.innerHTML = '<section class="container"><h1>Halaman tidak ditemukan</h1></section>';
      return;
    }

    // Use View Transition API for smooth page transitions
    const updateContent = async () => {
      // Render new page content
      this.#content.innerHTML = await page.render();
      
      // Wait for DOM to update
      await new Promise(resolve => setTimeout(resolve, isInitialLoad ? 0 : 10));

      // Execute afterRender
      await page.afterRender();
      
      // Focus management for skip to content
      this.#content.focus();
    };

    // Skip transition on initial load for faster perceived performance
    if (isInitialLoad) {
      await updateContent();
      return;
    }

    // Use View Transition API if supported
    if (document.startViewTransition) {
      try {
        const transition = document.startViewTransition(() => updateContent());
        await transition.finished;
      } catch (error) {
        // Fallback if transition fails
        console.warn('View transition failed, using fallback:', error);
        await updateContent();
      }
    } else {
      // Fallback for browsers without View Transition API
      await updateContent();
    }
  }

  // Register service worker for PWA
  async _registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New service worker available. Please refresh the page.');
            }
          });
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  // Setup push notification
  async _setupPushNotification() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported');
      return;
    }

    // Wait for service worker to be ready
    try {
      await navigator.serviceWorker.ready;
      
      // Check if user is logged in
      const token = localStorage.getItem('token');
      if (token) {
        // Request permission and subscribe
        const hasPermission = await pushNotification.requestPermission();
        if (hasPermission) {
          try {
            await pushNotification.subscribe();
            console.log('Push notification subscription successful');
          } catch (error) {
            console.error('Push notification subscription failed:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error setting up push notification:', error);
    }
  }

  // Setup PWA install prompt
  _setupInstallPrompt() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      this.deferredPrompt = e;
      // Show install button
      this._showInstallButton();
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.deferredPrompt = null;
      this._hideInstallButton();
    });

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this._hideInstallButton();
    }
  }

  // Show install button in navigation
  _showInstallButton() {
    let installBtn = document.getElementById('install-btn');
    if (!installBtn) {
      const navList = document.getElementById('nav-list');
      if (navList) {
        const listItem = document.createElement('li');
        listItem.innerHTML = '<a href="#" id="install-btn" aria-label="Install aplikasi">📥 Install</a>';
        navList.appendChild(listItem);
        
        installBtn = document.getElementById('install-btn');
        if (installBtn) {
          installBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await this._promptInstall();
          });
        }
      }
    } else {
      // Show the button if it exists but is hidden
      const listItem = installBtn.closest('li');
      if (listItem) {
        listItem.style.display = 'block';
      }
    }
  }

  // Hide install button
  _hideInstallButton() {
    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
      const listItem = installBtn.closest('li');
      if (listItem) {
        listItem.style.display = 'none';
      }
    }
  }

  // Prompt user to install PWA
  async _promptInstall() {
    if (!this.deferredPrompt) {
      return;
    }

    // Show the install prompt
    this.deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    // Clear the deferredPrompt
    this.deferredPrompt = null;
    this._hideInstallButton();
  }
}

export default App;
