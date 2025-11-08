export default class RegisterPage {
  async render() {
    // Transition is now handled by App class
    return `
      <section class="register-section">
        <div class="auth-container">
          <h1 class="auth-title">Daftar Akun Baru</h1>
          <form id="register-form" class="auth-form" novalidate>
            <div class="form-group">
              <label for="name">Nama</label>
              <input 
                type="text" 
                id="name" 
                name="name" 
                required 
                aria-required="true"
                aria-describedby="name-error"
              >
              <span id="name-error" class="error-message" role="alert" aria-live="polite"></span>
            </div>
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
                minlength="6"
              >
              <span id="password-error" class="error-message" role="alert" aria-live="polite"></span>
            </div>
            <div id="form-error" class="error-message form-error" role="alert" aria-live="polite"></div>
            <button type="submit" class="btn-primary">Daftar</button>
            <p class="auth-link">
              Sudah punya akun? <a href="#/login">Masuk di sini</a>
            </p>
          </form>
        </div>
      </section>
    `;
  }

  async afterRender() {
    const form = document.getElementById('register-form');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const formError = document.getElementById('form-error');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Clear previous errors
      document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
      formError.textContent = '';

      let isValid = true;

      // Validate name
      if (!nameInput.value || nameInput.value.trim().length < 3) {
        document.getElementById('name-error').textContent = 'Nama minimal 3 karakter';
        nameInput.setAttribute('aria-invalid', 'true');
        isValid = false;
      } else {
        nameInput.setAttribute('aria-invalid', 'false');
      }

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
        const response = await Api.register({
          name: nameInput.value.trim(),
          email: emailInput.value.trim(),
          password: passwordInput.value,
        });

        // Handle berbagai format response
        if (response && (response.error === false || !response.error)) {
          formError.textContent = '';
          formError.className = 'success-message form-error';
          formError.textContent = 'Pendaftaran berhasil! Mengarahkan ke halaman login...';
          setTimeout(() => {
            window.location.hash = '#/login';
          }, 1500);
        } else {
          throw new Error(response?.message || 'Registrasi gagal. Silakan coba lagi.');
        }
      } catch (error) {
        formError.textContent = error.message || 'Registrasi gagal. Silakan coba lagi.';
        formError.setAttribute('aria-live', 'assertive');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
  }
}

