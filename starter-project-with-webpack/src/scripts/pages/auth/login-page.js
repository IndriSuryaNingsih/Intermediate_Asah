export default class LoginPage {
  async render() {
    // Transition is now handled by App class
    return `
      <section class="login-section">
        <div class="auth-container">
          <h1 class="auth-title">Masuk ke Akun</h1>
          <form id="login-form" class="auth-form" novalidate>
            <div class="form-group">
              <label for="email">Email</label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                required 
                aria-required="true"
                aria-describedby="email-error"
              >
              <span id="email-error" class="error-message" role="alert" aria-live="polite"></span>
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input 
                type="password" 
                id="password" 
                name="password" 
                required 
                aria-required="true"
                aria-describedby="password-error"
              >
              <span id="password-error" class="error-message" role="alert" aria-live="polite"></span>
            </div>
            <div id="form-error" class="error-message form-error" role="alert" aria-live="polite"></div>
            <button type="submit" class="btn-primary">Masuk</button>
            <p class="auth-link">
              Belum punya akun? <a href="#/register">Daftar di sini</a>
            </p>
          </form>
        </div>
      </section>
    `;
  }

  async afterRender() {
    const form = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const formError = document.getElementById('form-error');

    // Form validation
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Clear previous errors
      document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
      formError.textContent = '';

      let isValid = true;

      // Validate email
      if (!emailInput.value || !emailInput.validity.valid) {
        document.getElementById('email-error').textContent = 'Email tidak valid';
        emailInput.setAttribute('aria-invalid', 'true');
        isValid = false;
      } else {
        emailInput.setAttribute('aria-invalid', 'false');
      }

      // Validate password
      if (!passwordInput.value || passwordInput.value.length < 6) {
        document.getElementById('password-error').textContent = 'Password minimal 6 karakter';
        passwordInput.setAttribute('aria-invalid', 'true');
        isValid = false;
      } else {
        passwordInput.setAttribute('aria-invalid', 'false');
      }

      if (!isValid) return;

      // Disable button dan tampilkan loading
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Memproses...';

      try {
        const Api = (await import('../../data/api')).default;
        const response = await Api.login({
          email: emailInput.value.trim(),
          password: passwordInput.value,
        });

        // Debug: log response untuk melihat strukturnya
        console.log('Login response:', response);

        // Handle berbagai format response dari API
        let token = null;
        let user = null;

        // Format 1: { error: false, message: "success", data: { token: "...", user: {...} } }
        if (response && response.data) {
          token = response.data.token;
          user = response.data.user;
        }
        // Format 2: { token: "...", user: {...} }
        else if (response && response.token) {
          token = response.token;
          user = response.user;
        }
        // Format 3: { error: false, message: "success", loginResult: { token: "...", user: {...} } }
        else if (response && response.loginResult) {
          token = response.loginResult.token;
          user = response.loginResult.user;
        }
        // Format 4: langsung di root
        else if (response) {
          // Coba cari token di berbagai kemungkinan lokasi
          token = response.token || response.accessToken || response.access_token;
          user = response.user || response.userData;
        }

        if (token) {
          localStorage.setItem('token', token);
          if (user) {
            localStorage.setItem('user', JSON.stringify(user));
          } else {
            // Jika user tidak ada, simpan object minimal
            localStorage.setItem('user', JSON.stringify({ email: emailInput.value.trim() }));
          }
          
          formError.textContent = '';
          formError.className = 'success-message form-error';
          formError.textContent = 'Login berhasil! Mengarahkan...';
          
          setTimeout(() => {
            // Use SPA navigation instead of reload
            window.location.hash = '#/';
            // Trigger hashchange event for SPA navigation
            window.dispatchEvent(new HashChangeEvent('hashchange'));
          }, 500);
          return;
        }
        
        // Jika tidak ada token, cek apakah ada error message
        const errorMsg = response?.message || 'Format response tidak valid. Token tidak ditemukan.';
        console.error('Login error - response structure:', response);
        throw new Error(errorMsg);
      } catch (error) {
        console.error('Login error:', error);
        formError.textContent = error.message || 'Login gagal. Silakan coba lagi.';
        formError.setAttribute('aria-live', 'assertive');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
  }
}

