import Api from '../../data/api';
import IndexedDB from '../../utils/indexeddb';

export default class HomePage {
  constructor() {
    this.stories = [];
    this.map = null;
    this.markers = [];
    this.filteredStories = [];
  }

  async render() {
    // Transition is now handled by App class
    
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const isLoggedIn = !!localStorage.getItem('token');

    return `
      <section class="home-section">
        <div class="container">
          <div class="home-header">
            <h1 class="page-title">Toko Belanja Terdekat</h1>
            ${isLoggedIn ? `
              <div class="user-info">
                <span>Halo, ${user?.name || 'User'}!</span>
                <button id="logout-btn" class="btn-secondary" aria-label="Logout">Keluar</button>
              </div>
            ` : ''}
          </div>

          <div class="filter-section" role="search" aria-label="Filter lokasi">
            <label for="filter-input" class="visually-hidden">Cari lokasi toko</label>
            <input 
              type="text" 
              id="filter-input" 
              placeholder="Cari toko berdasarkan nama atau deskripsi..."
              aria-label="Cari lokasi toko"
            >
            <button id="clear-filter" class="btn-clear" aria-label="Hapus filter">✕</button>
          </div>

          <div class="shopping-layout">
            <div class="shopping-list" role="list" aria-label="Daftar toko">
              <h2 class="list-title">Daftar Toko</h2>
              <div id="stories-container" class="stories-container">
                <div class="loading">Memuat data...</div>
              </div>
            </div>

            <div class="map-container">
              <h2 class="map-title">Peta Lokasi</h2>
              <div id="map" class="map" role="application" aria-label="Peta lokasi toko"></div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    await this.loadStories();
    this.initMap();
    this.setupFilter();
    this.setupLogout();

    // Make all interactive elements keyboard accessible
    this.setupKeyboardNavigation();
  }

  async loadStories() {
    const container = document.getElementById('stories-container');
    
    try {
      container.innerHTML = '<div class="loading">Memuat data...</div>';
      const response = await Api.getStories();
      
      // Log untuk debugging
      console.log('Home Page - Stories Response:', response);
      
      // Handle berbagai format response
      let storiesList = [];
      
      // Format 1: { error: false, message: "success", data: { listStory: [...] } }
      if (response && response.data && response.data.listStory) {
        storiesList = response.data.listStory;
      }
      // Format 2: { error: false, message: "success", data: [...] }
      else if (response && response.data && Array.isArray(response.data)) {
        storiesList = response.data;
      }
      // Format 3: { listStory: [...] }
      else if (response && response.listStory && Array.isArray(response.listStory)) {
        storiesList = response.listStory;
      }
      // Format 4: Langsung array
      else if (response && Array.isArray(response)) {
        storiesList = response;
      }
      // Format 5: { stories: [...] }
      else if (response && response.stories && Array.isArray(response.stories)) {
        storiesList = response.stories;
      }
      // Format 6: Jika response.error === false tapi tidak ada data, anggap kosong
      else if (response && response.error === false) {
        storiesList = [];
      }
      
      this.stories = storiesList;
      this.filteredStories = [...this.stories];
      
      if (this.stories.length === 0) {
        const isLoggedIn = !!localStorage.getItem('token');
        container.innerHTML = `
          <div class="empty-message">
            <p>Belum ada toko yang terdaftar.</p>
            ${!isLoggedIn ? '<p><a href="#/login">Login</a> atau <a href="#/register">Daftar</a> untuk menambah toko baru.</p>' : '<p><a href="#/add-story">Tambah toko pertama</a></p>'}
          </div>
        `;
        // Inisialisasi peta kosong
        if (this.map) {
          this.map.setView([-2.5489, 118.0149], 5);
        }
      } else {
        await this.renderStories();
        this.updateMapMarkers();
      }
    } catch (error) {
      console.error('Load Stories Error:', error);
      
      container.innerHTML = `
        <div class="error-message">
          <p>${error.message || 'Gagal memuat data'}</p>
          <p style="margin-top: 10px; font-size: 0.9rem;">Silakan refresh halaman atau coba lagi nanti.</p>
        </div>
      `;
    }
  }

  async renderStories() {
    const container = document.getElementById('stories-container');
    
    if (this.filteredStories.length === 0) {
      container.innerHTML = '<div class="empty-message">Tidak ada toko yang ditemukan</div>';
      return;
    }

    // Check favorite status for all stories
    for (const story of this.filteredStories) {
      try {
        story.isFavorite = await IndexedDB.isFavorite(story.id);
      } catch (error) {
        story.isFavorite = false;
      }
    }

    container.innerHTML = this.filteredStories.map((story, index) => {
      const storyName = story.name || story.description?.substring(0, 30) + '...' || 'Toko';
      const storyDescription = story.description || 'Tidak ada deskripsi';
      const storyDate = story.createdAt ? new Date(story.createdAt).toLocaleDateString('id-ID') : '-';
      const locationText = story.lat && story.lon ? `${parseFloat(story.lat).toFixed(4)}, ${parseFloat(story.lon).toFixed(4)}` : 'Lokasi tidak tersedia';
      
      return `
      <article 
        class="story-card ${story.isHighlighted ? 'highlighted' : ''}" 
        data-story-id="${story.id}"
        role="listitem"
        tabindex="0"
        aria-label="Toko ${storyName} di ${locationText}"
      >
        <div class="story-image">
          <img 
            src="${story.photoUrl}" 
            alt="${storyDescription}"
            loading="lazy"
          >
        </div>
        <div class="story-content">
          <div class="story-header">
            <h3 class="story-name">${storyName}</h3>
            <div class="story-actions">
              <button 
                class="favorite-btn ${story.isFavorite ? 'favorited' : ''}" 
                data-story-id="${story.id}"
                aria-label="${story.isFavorite ? 'Hapus dari favorit' : 'Tambah ke favorit'}"
                title="${story.isFavorite ? 'Hapus dari favorit' : 'Tambah ke favorit'}"
              >${story.isFavorite ? '❤️' : '🤍'}</button>
              <button 
                class="delete-story-btn" 
                data-story-id="${story.id}"
                aria-label="Hapus toko ${storyName}"
                title="Hapus toko"
              >🗑️</button>
            </div>
          </div>
          <p class="story-description">${storyDescription}</p>
          <div class="story-meta">
            <span class="story-date">${storyDate}</span>
            ${locationText !== 'Lokasi tidak tersedia' ? `<span class="story-location">📍 ${locationText}</span>` : ''}
          </div>
        </div>
      </article>
    `;
    }).join('');

    // Add click handlers and keyboard handlers for story cards
    container.querySelectorAll('.story-card').forEach((card, index) => {
      const storyId = card.dataset.storyId;
      
      card.addEventListener('click', async (e) => {
        // Don't highlight if delete button was clicked
        if (e.target.classList.contains('delete-story-btn') || e.target.classList.contains('favorite-btn')) {
          return;
        }
        await this.highlightStory(storyId);
      });

      card.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (e.target.classList.contains('delete-story-btn')) {
            await this.deleteStory(storyId);
          } else if (!e.target.classList.contains('favorite-btn')) {
            await this.highlightStory(storyId);
          }
        }
      });
    });

    // Add favorite button handlers
    container.querySelectorAll('.favorite-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent card click
        const storyId = btn.dataset.storyId;
        await this.toggleFavorite(storyId);
      });
    });

    // Add delete button handlers
    container.querySelectorAll('.delete-story-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent card click
        const storyId = btn.dataset.storyId;
        if (confirm('Apakah Anda yakin ingin menghapus toko ini?')) {
          await this.deleteStory(storyId);
        }
      });
    });
  }

  async toggleFavorite(storyId) {
    try {
      const story = this.stories.find(s => s.id === storyId);
      if (!story) return;

      const isFavorite = await IndexedDB.isFavorite(storyId);
      
      if (isFavorite) {
        await IndexedDB.removeFavorite(storyId);
        story.isFavorite = false;
      } else {
        await IndexedDB.addFavorite(story);
        story.isFavorite = true;
      }

      // Update filtered stories
      const filteredStory = this.filteredStories.find(s => s.id === storyId);
      if (filteredStory) {
        filteredStory.isFavorite = story.isFavorite;
      }

      // Re-render to update favorite button
      await this.renderStories();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Gagal mengubah status favorit. Silakan coba lagi.');
    }
  }

  async deleteStory(storyId) {
    try {
      // Remove from favorites if exists
      try {
        await IndexedDB.removeFavorite(storyId);
      } catch (error) {
        // Ignore if not in favorites
      }

      // Remove from stories array
      this.stories = this.stories.filter(story => story.id !== storyId);
      this.filteredStories = this.filteredStories.filter(story => story.id !== storyId);

      // Remove marker from map
      const markerIndex = this.markers.findIndex(m => m.options.storyId === storyId);
      if (markerIndex !== -1) {
        this.map.removeLayer(this.markers[markerIndex]);
        this.markers.splice(markerIndex, 1);
      }

      // Re-render stories
      await this.renderStories();
      this.updateMapMarkers();

      // Show success message
      const container = document.getElementById('stories-container');
      const successMsg = document.createElement('div');
      successMsg.className = 'success-message';
      successMsg.textContent = 'Toko berhasil dihapus!';
      successMsg.style.cssText = 'background: #4CAF50; color: white; padding: 10px; margin: 10px 0; border-radius: 4px;';
      container.insertBefore(successMsg, container.firstChild);
      
      setTimeout(() => {
        successMsg.remove();
      }, 3000);
    } catch (error) {
      console.error('Error deleting story:', error);
      alert('Gagal menghapus toko. Silakan coba lagi.');
    }
  }

  initMap() {
    if (typeof L === 'undefined') {
      // Load Leaflet CSS and JS if not loaded
      this.loadLeaflet();
      return;
    }

    // Initialize map centered on Indonesia
    this.map = L.map('map').setView([-2.5489, 118.0149], 5);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);

    // Update markers after map is initialized
    if (this.stories.length > 0) {
      this.updateMapMarkers();
    }
  }

  loadLeaflet() {
    // Add Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Add Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      this.initMap();
    };
    document.body.appendChild(script);
  }

  updateMapMarkers() {
    if (!this.map) return;

    // Clear existing markers
    this.markers.forEach(marker => this.map.removeLayer(marker));
    this.markers = [];

    // Add markers for filtered stories
    this.filteredStories.forEach((story) => {
      if (story.lat && story.lon) {
        const storyName = story.name || story.description?.substring(0, 30) + '...' || 'Toko';
        const storyDescription = story.description || 'Tidak ada deskripsi';
        const locationText = `${parseFloat(story.lat).toFixed(4)}, ${parseFloat(story.lon).toFixed(4)}`;
        
        // Create custom icon for highlighted markers
        const defaultIcon = L.icon({
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
        });

        const highlightIcon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
        });

        // Create popup content with better formatting
        const popupContent = `
          <div style="min-width: 200px;">
            ${story.photoUrl ? `<img src="${story.photoUrl}" alt="${storyName}" style="width: 100%; max-width: 200px; height: auto; border-radius: 8px; margin-bottom: 10px;">` : ''}
            <strong style="font-size: 16px; color: #333; display: block; margin-bottom: 8px;">${storyName}</strong>
            <p style="margin: 8px 0; color: #666; font-size: 14px; line-height: 1.4;">${storyDescription}</p>
            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #eee;">
              <span style="font-size: 12px; color: #888;">📍 ${locationText}</span>
            </div>
          </div>
        `;

        const marker = L.marker([parseFloat(story.lat), parseFloat(story.lon)], {
          storyId: story.id,
          icon: story.isHighlighted ? highlightIcon : defaultIcon,
        }).addTo(this.map);

        // Bind popup with options to ensure it can be opened
        marker.bindPopup(popupContent, {
          maxWidth: 250,
          className: 'custom-popup',
        });

        // Open popup on marker click
        marker.on('click', async () => {
          marker.openPopup();
          await this.highlightStory(story.id);
        });

        // Also open popup when marker is added if highlighted
        if (story.isHighlighted) {
          setTimeout(() => {
            marker.openPopup();
          }, 300);
        }

        this.markers.push(marker);
      }
    });

    // Fit map bounds to show all markers
    if (this.markers.length > 0) {
      const group = new L.featureGroup(this.markers);
      this.map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  async highlightStory(storyId) {
    // Remove previous highlights
    this.stories.forEach(story => {
      story.isHighlighted = false;
    });
    this.filteredStories.forEach(story => {
      story.isHighlighted = false;
    });

    // Add highlight
    const story = this.stories.find(s => s.id === storyId);
    const filteredStory = this.filteredStories.find(s => s.id === storyId);
    
    if (story) story.isHighlighted = true;
    if (filteredStory) filteredStory.isHighlighted = true;

    // Scroll to card and center map
    const card = document.querySelector(`[data-story-id="${storyId}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.focus();
    }

    // Center map on marker and open popup
    const marker = this.markers.find(m => m.options.storyId === storyId);
    if (marker && this.map) {
      this.map.setView(marker.getLatLng(), this.map.getZoom(), {
        animate: true,
      });
      // Open popup when highlighting
      setTimeout(() => {
        marker.openPopup();
      }, 300);
    }

    await this.renderStories();
    this.updateMapMarkers();
  }

  setupFilter() {
    const filterInput = document.getElementById('filter-input');
    const clearFilter = document.getElementById('clear-filter');

    if (!filterInput) return;

    filterInput.addEventListener('input', async (e) => {
      const query = e.target.value.toLowerCase().trim();
      
      if (query === '') {
        this.filteredStories = [...this.stories];
      } else {
        this.filteredStories = this.stories.filter(story => {
          const name = (story.name || '').toLowerCase();
          const description = (story.description || '').toLowerCase();
          const location = story.lat && story.lon 
            ? `${story.lat},${story.lon}`.toLowerCase() 
            : '';
          return name.includes(query) || description.includes(query) || location.includes(query);
        });
      }

      await this.renderStories();
      this.updateMapMarkers();
    });

    if (clearFilter) {
      clearFilter.addEventListener('click', async () => {
        filterInput.value = '';
        this.filteredStories = [...this.stories];
        await this.renderStories();
        this.updateMapMarkers();
      });

      clearFilter.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          clearFilter.click();
        }
      });
    }
  }

  setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Use SPA navigation instead of reload
        window.location.hash = '#/login';
        // Trigger hashchange event for SPA navigation
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      logoutBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          logoutBtn.click();
        }
      });
    }
  }

  setupKeyboardNavigation() {
    // All interactive elements should be keyboard accessible
    const interactiveElements = document.querySelectorAll('button, a, input, [tabindex="0"]');
    interactiveElements.forEach(element => {
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '0');
      }
    });
  }
}
