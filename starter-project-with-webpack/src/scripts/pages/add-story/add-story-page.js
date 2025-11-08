import Api from '../../data/api';

export default class AddStoryPage {
  constructor() {
    this.map = null;
    this.marker = null;
    this.selectedLat = null;
    this.selectedLon = null;
  }

  async render() {
    // Transition is now handled by App class

    const isLoggedIn = !!localStorage.getItem('token');
    if (!isLoggedIn) {
      return `
        <section class="add-story-section">
          <div class="auth-container">
            <h1 class="auth-title">Akses Ditolak</h1>
            <p>Anda harus login terlebih dahulu untuk menambahkan toko baru.</p>
            <a href="#/login" class="btn-primary">Masuk</a>
          </div>
        </section>
      `;
    }

    return `
      <section class="add-story-section">
        <div class="container">
          <h1 class="page-title">Tambah Toko Baru</h1>
          
          <form id="add-story-form" class="add-story-form" novalidate>
            <div class="form-group">
              <label for="description">Deskripsi Toko</label>
              <textarea 
                id="description" 
                name="description" 
                rows="4" 
                required 
                aria-required="true"
                aria-describedby="description-error"
                placeholder="Masukkan deskripsi toko..."
              ></textarea>
              <span id="description-error" class="error-message" role="alert" aria-live="polite"></span>
            </div>

            <div class="form-group">
              <label for="photo">Foto Toko</label>
              <input 
                type="file" 
                id="photo" 
                name="photo" 
                accept="image/*" 
                required 
                aria-required="true"
                aria-describedby="photo-error"
              >
              <span id="photo-error" class="error-message" role="alert" aria-live="polite"></span>
              <div id="photo-preview" class="photo-preview" role="img" aria-label="Preview foto toko"></div>
            </div>

            <div class="form-group">
              <label for="location">Pilih Lokasi di Peta</label>
              <p class="helper-text">Klik pada peta untuk memilih lokasi toko</p>
              <div id="map" class="map-small" role="application" aria-label="Peta untuk memilih lokasi"></div>
              <div class="location-info">
                <span id="location-display">Belum memilih lokasi</span>
              </div>
            </div>

            <div id="form-error" class="error-message form-error" role="alert" aria-live="polite"></div>
            <div id="form-success" class="success-message form-success" role="alert" aria-live="polite"></div>

            <div class="form-actions">
              <button type="submit" class="btn-primary" id="submit-btn">Tambah Toko</button>
              <a href="#/" class="btn-secondary">Batal</a>
            </div>
          </form>
        </div>
      </section>
    `;
  }

  async afterRender() {
    const isLoggedIn = !!localStorage.getItem('token');
    if (!isLoggedIn) return;

    await this.initMap();
    this.setupForm();
    this.setupPhotoPreview();
    this.setupKeyboardNavigation();
  }

  async initMap() {
    if (typeof L === 'undefined') {
      this.loadLeaflet();
      return;
    }

    // Initialize map centered on Indonesia
    this.map = L.map('map').setView([-2.5489, 118.0149], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);

    // Add click handler to select location
    this.map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      this.selectedLat = lat;
      this.selectedLon = lng;

      // Remove existing marker
      if (this.marker) {
        this.map.removeLayer(this.marker);
      }

      // Add new marker
      this.marker = L.marker([lat, lng])
        .addTo(this.map)
        .bindPopup(`Lokasi: ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        .openPopup();

      // Update location display
      const locationDisplay = document.getElementById('location-display');
      if (locationDisplay) {
        locationDisplay.textContent = `Lokasi: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
    });
  }

  loadLeaflet() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      this.initMap();
    };
    document.body.appendChild(script);
  }

  setupForm() {
    const form = document.getElementById('add-story-form');
    const descriptionInput = document.getElementById('description');
    const photoInput = document.getElementById('photo');
    const formError = document.getElementById('form-error');
    const formSuccess = document.getElementById('form-success');
    const submitBtn = document.getElementById('submit-btn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Clear previous messages
      document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
      formError.textContent = '';
      formSuccess.textContent = '';

      let isValid = true;

      // Validate description
      if (!descriptionInput.value || descriptionInput.value.trim().length < 10) {
        document.getElementById('description-error').textContent = 'Deskripsi minimal 10 karakter';
        descriptionInput.setAttribute('aria-invalid', 'true');
        isValid = false;
      } else {
        descriptionInput.setAttribute('aria-invalid', 'false');
      }

      // Validate photo
      if (!photoInput.files || photoInput.files.length === 0) {
        document.getElementById('photo-error').textContent = 'Foto wajib diunggah';
        photoInput.setAttribute('aria-invalid', 'true');
        isValid = false;
      } else {
        photoInput.setAttribute('aria-invalid', 'false');
      }

      // Validate location
      if (!this.selectedLat || !this.selectedLon) {
        formError.textContent = 'Silakan pilih lokasi di peta terlebih dahulu';
        formError.setAttribute('aria-live', 'assertive');
        isValid = false;
      }

      if (!isValid) return;

      // Disable submit button
      submitBtn.disabled = true;
      submitBtn.textContent = 'Mengirim...';

      try {
        const response = await Api.addStory({
          description: descriptionInput.value.trim(),
          photo: photoInput.files[0],
          lat: this.selectedLat.toString(),
          lon: this.selectedLon.toString(),
        });

        if (response.error === false) {
          formSuccess.textContent = 'Toko berhasil ditambahkan! Mengarahkan ke halaman utama...';
          formSuccess.setAttribute('aria-live', 'assertive');
          form.reset();
          this.selectedLat = null;
          this.selectedLon = null;
          if (this.marker) {
            this.map.removeLayer(this.marker);
            this.marker = null;
          }
          const locationDisplay = document.getElementById('location-display');
          if (locationDisplay) {
            locationDisplay.textContent = 'Belum memilih lokasi';
          }
          const photoPreview = document.getElementById('photo-preview');
          if (photoPreview) {
            photoPreview.innerHTML = '';
          }

          setTimeout(() => {
            window.location.hash = '#/';
          }, 2000);
        }
      } catch (error) {
        formError.textContent = error.message || 'Gagal menambahkan toko. Silakan coba lagi.';
        formError.setAttribute('aria-live', 'assertive');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Tambah Toko';
      }
    });
  }

  setupPhotoPreview() {
    const photoInput = document.getElementById('photo');
    const photoPreview = document.getElementById('photo-preview');

    if (!photoInput || !photoPreview) return;

    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          photoPreview.innerHTML = `
            <img src="${event.target.result}" alt="Preview foto toko yang akan diunggah">
          `;
        };
        reader.readAsDataURL(file);
      } else {
        photoPreview.innerHTML = '';
      }
    });
  }

  setupKeyboardNavigation() {
    const interactiveElements = document.querySelectorAll('button, a, input, textarea, [tabindex="0"]');
    interactiveElements.forEach(element => {
      if (!element.hasAttribute('tabindex') && !element.hasAttribute('disabled')) {
        element.setAttribute('tabindex', '0');
      }
    });
  }
}

