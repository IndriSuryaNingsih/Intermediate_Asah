import IndexedDB from '../../utils/indexeddb';

export default class FavoritesPage {
  constructor() {
    this.favorites = [];
  }

  async render() {
    const isLoggedIn = !!localStorage.getItem('token');

    return `
      <section class="favorites-section">
        <div class="container">
          <div class="page-header">
            <h1 class="page-title">Toko Favorit Saya</h1>
            <p class="page-subtitle">Daftar toko yang telah Anda simpan sebagai favorit</p>
          </div>

          <div id="favorites-container" class="favorites-container">
            <div class="loading">Memuat data...</div>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    await this.loadFavorites();
    this.setupKeyboardNavigation();
  }

  async loadFavorites() {
    const container = document.getElementById('favorites-container');
    
    try {
      container.innerHTML = '<div class="loading">Memuat data...</div>';
      
      // Get favorites from IndexedDB
      this.favorites = await IndexedDB.getAllFavorites();
      
      if (this.favorites.length === 0) {
        container.innerHTML = `
          <div class="empty-message">
            <p>Belum ada toko favorit.</p>
            <p style="margin-top: 10px;"><a href="#/">Kembali ke beranda</a> untuk menambahkan toko ke favorit.</p>
          </div>
        `;
      } else {
        this.renderFavorites();
      }
    } catch (error) {
      console.error('Load Favorites Error:', error);
      container.innerHTML = `
        <div class="error-message">
          <p>${error.message || 'Gagal memuat data favorit'}</p>
          <p style="margin-top: 10px; font-size: 0.9rem;">Silakan refresh halaman atau coba lagi nanti.</p>
        </div>
      `;
    }
  }

  renderFavorites() {
    const container = document.getElementById('favorites-container');
    
    if (this.favorites.length === 0) {
      container.innerHTML = '<div class="empty-message">Tidak ada toko favorit</div>';
      return;
    }

    container.innerHTML = this.favorites.map((story) => {
      const storyName = story.name || story.description?.substring(0, 30) + '...' || 'Toko';
      const storyDescription = story.description || 'Tidak ada deskripsi';
      const storyDate = story.createdAt ? new Date(story.createdAt).toLocaleDateString('id-ID') : '-';
      const locationText = story.lat && story.lon ? `${parseFloat(story.lat).toFixed(4)}, ${parseFloat(story.lon).toFixed(4)}` : 'Lokasi tidak tersedia';
      
      return `
      <article 
        class="story-card" 
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
                class="favorite-btn favorited" 
                data-story-id="${story.id}"
                aria-label="Hapus dari favorit"
                title="Hapus dari favorit"
              >❤️</button>
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

    // Add favorite button handlers
    container.querySelectorAll('.favorite-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const storyId = btn.dataset.storyId;
        await this.removeFavorite(storyId);
      });
    });
  }

  async removeFavorite(storyId) {
    try {
      await IndexedDB.removeFavorite(storyId);
      
      // Remove from favorites array
      this.favorites = this.favorites.filter(story => story.id !== storyId);

      // Re-render favorites
      this.renderFavorites();

      // Show success message
      const container = document.getElementById('favorites-container');
      const successMsg = document.createElement('div');
      successMsg.className = 'success-message';
      successMsg.textContent = 'Toko dihapus dari favorit!';
      successMsg.style.cssText = 'background: #4CAF50; color: white; padding: 10px; margin: 10px 0; border-radius: 4px;';
      container.insertBefore(successMsg, container.firstChild);
      
      setTimeout(() => {
        successMsg.remove();
      }, 3000);
    } catch (error) {
      console.error('Error removing favorite:', error);
      alert('Gagal menghapus dari favorit. Silakan coba lagi.');
    }
  }

  setupKeyboardNavigation() {
    const interactiveElements = document.querySelectorAll('button, a, [tabindex="0"]');
    interactiveElements.forEach(element => {
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '0');
      }
    });
  }
}

