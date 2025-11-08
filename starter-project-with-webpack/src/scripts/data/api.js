import CONFIG from '../config';

const ENDPOINTS = {
  STORIES: `${CONFIG.BASE_URL}/stories`,
  LOGIN: `${CONFIG.BASE_URL}/login`,
  REGISTER: `${CONFIG.BASE_URL}/register`,
  ADD_STORY: `${CONFIG.BASE_URL}/stories`,
  VAPID_PUBLIC_KEY: `${CONFIG.BASE_URL}/notifications/vapid-public-key`,
  SUBSCRIBE_NOTIFICATION: `${CONFIG.BASE_URL}/notifications/subscribe`,
};

class Api {
  static async getStories() {
    const token = localStorage.getItem('token');
    
    // Jika tidak ada token, langsung return data kosong tanpa fetch (menghindari 401 error di console)
    if (!token) {
      return {
        error: false,
        message: 'success',
        data: { listStory: [] }
      };
    }
    
    // Jika ada token, lakukan fetch dengan authentication
    try {
      const response = await fetch(ENDPOINTS.STORIES, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      let responseJson;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          responseJson = await response.json();
        } else {
          // If response is not JSON (e.g., HTML error page), throw error
          const text = await response.text();
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      } catch (parseError) {
        if (parseError.message.includes('Server error')) {
          throw parseError;
        }
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      // Log untuk debugging
      console.log('Get Stories Response:', responseJson);
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token invalid, clear token
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          throw new Error('Session expired. Silakan login kembali.');
        } else if (response.status === 405) {
          throw new Error('Method not allowed. Pastikan endpoint API benar.');
        }
        throw new Error(responseJson?.message || `Failed to fetch stories (${response.status})`);
      }
      
      // Pastikan response memiliki struktur yang benar
      // Jika error === true, return data kosong atau throw error
      if (responseJson && responseJson.error === true) {
        throw new Error(responseJson.message || 'Gagal memuat data stories');
      }
      
      // Return response apa adanya (bisa berbagai format)
      return responseJson;
    } catch (error) {
      // Handle network errors
      if (error.message && (error.message.includes('fetch') || error.message.includes('Network'))) {
        throw new Error('Network error: Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
      }
      throw error;
    }
  }

  static async addStory({ description, photo, lat, lon }) {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Anda harus login terlebih dahulu');
      }

      if (!description || !photo || !lat || !lon) {
        throw new Error('Semua field wajib diisi');
      }

      const formData = new FormData();
      formData.append('description', description.trim());
      formData.append('photo', photo);
      formData.append('lat', lat.toString());
      formData.append('lon', lon.toString());

      const response = await fetch(ENDPOINTS.ADD_STORY, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const responseJson = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Silakan login kembali.');
        } else if (response.status === 400) {
          throw new Error(responseJson.message || 'Data tidak valid. Pastikan semua field sudah diisi dengan benar.');
        } else {
          throw new Error(responseJson.message || 'Gagal menambahkan toko. Silakan coba lagi.');
        }
      }
      
      return responseJson;
    } catch (error) {
      if (error.message.includes('fetch')) {
        throw new Error('Network error: Unable to add story. Please check your connection.');
      }
      throw error;
    }
  }

  static async login({ email, password }) {
    try {
      if (!email || !password) {
        throw new Error('Email dan password wajib diisi');
      }

      const emailValue = email.trim().toLowerCase();
      const passwordValue = password.trim();

      if (!emailValue || !passwordValue) {
        throw new Error('Email dan password tidak boleh kosong');
      }

      const response = await fetch(ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: emailValue, 
          password: passwordValue
        }),
      });

      let responseJson;
      try {
        responseJson = await response.json();
      } catch (parseError) {
        // Jika response tidak bisa di-parse sebagai JSON
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(responseJson.message || 'Email atau password salah');
        } else if (response.status === 400) {
          throw new Error(responseJson.message || 'Data tidak valid. Pastikan email dan password sudah benar.');
        } else {
          throw new Error(responseJson.message || `Login gagal (${response.status}). Silakan coba lagi.`);
        }
      }
      
      // Log response untuk debugging
      console.log('API Login Response:', responseJson);
      
      // Pastikan response memiliki struktur yang benar
      // Jika error === true, throw error
      if (responseJson && responseJson.error === true) {
        throw new Error(responseJson.message || 'Login gagal. Silakan coba lagi.');
      }
      
      // Return response apa adanya, biarkan page handle strukturnya
      return responseJson;
    } catch (error) {
      if (error.message.includes('fetch') || error.message.includes('Network')) {
        throw new Error('Network error: Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
      }
      throw error;
    }
  }

  static async register({ name, email, password }) {
    try {
      // Validasi input sebelum mengirim
      if (!name || !email || !password) {
        throw new Error('Semua field wajib diisi');
      }

      const nameValue = name.trim();
      const emailValue = email.trim().toLowerCase();
      const passwordValue = password.trim();

      if (!nameValue || nameValue.length < 3) {
        throw new Error('Nama minimal 3 karakter');
      }

      if (!emailValue || !emailValue.includes('@') || !emailValue.includes('.')) {
        throw new Error('Format email tidak valid');
      }

      if (!passwordValue || passwordValue.length < 6) {
        throw new Error('Password minimal 6 karakter');
      }

      const response = await fetch(ENDPOINTS.REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: nameValue,
          email: emailValue,
          password: passwordValue
        }),
      });

      let responseJson;
      try {
        responseJson = await response.json();
      } catch (parseError) {
        // Jika response tidak bisa di-parse sebagai JSON
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      if (!response.ok) {
        // Handle berbagai jenis error
        if (response.status === 400) {
          const errorMsg = responseJson.message || 'Data tidak valid. Pastikan: nama minimal 3 karakter, email valid, password minimal 6 karakter.';
          throw new Error(errorMsg);
        } else if (response.status === 500) {
          throw new Error('Server error. Silakan coba lagi nanti.');
        } else {
          throw new Error(responseJson.message || `Registrasi gagal (${response.status}). Silakan coba lagi.`);
        }
      }
      
      // Pastikan response memiliki struktur yang benar
      if (responseJson && responseJson.error === true) {
        throw new Error(responseJson.message || 'Registrasi gagal. Silakan coba lagi.');
      }
      
      return responseJson;
    } catch (error) {
      // Handle network errors
      if (error.message.includes('fetch') || error.message.includes('Network')) {
        throw new Error('Network error: Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
      }
      throw error;
    }
  }

  static async getVapidPublicKey() {
    try {
      const response = await fetch(ENDPOINTS.VAPID_PUBLIC_KEY, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // If not JSON, endpoint might not exist or return HTML error
        if (response.status === 405) {
          throw new Error('VAPID endpoint tidak tersedia atau method tidak didukung');
        }
        const text = await response.text();
        throw new Error(`Server mengembalikan non-JSON: ${response.status}`);
      }

      const responseJson = await response.json();

      if (!response.ok) {
        if (response.status === 405) {
          throw new Error('VAPID endpoint tidak tersedia atau method tidak didukung');
        }
        throw new Error(responseJson.message || 'Failed to get VAPID public key');
      }

      return responseJson;
    } catch (error) {
      if (error.message.includes('fetch') || error.message.includes('Network')) {
        throw new Error('Network error: Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
      }
      throw error;
    }
  }

  static async subscribeNotification(subscription) {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('Anda harus login terlebih dahulu');
      }

      const response = await fetch(ENDPOINTS.SUBSCRIBE_NOTIFICATION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(subscription),
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      let responseJson;
      if (contentType && contentType.includes('application/json')) {
        responseJson = await response.json();
      } else {
        // If not JSON, might be HTML error page
        const text = await response.text();
        if (response.status === 405) {
          throw new Error('Subscribe endpoint tidak tersedia atau method tidak didukung');
        }
        throw new Error(`Server mengembalikan non-JSON: ${response.status}`);
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Silakan login kembali.');
        } else if (response.status === 405) {
          throw new Error('Subscribe endpoint tidak tersedia atau method tidak didukung');
        } else {
          throw new Error(responseJson?.message || 'Failed to subscribe to notifications');
        }
      }

      return responseJson;
    } catch (error) {
      if (error.message.includes('fetch') || error.message.includes('Network')) {
        throw new Error('Network error: Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
      }
      throw error;
    }
  }
}

export default Api;