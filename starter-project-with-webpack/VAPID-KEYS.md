# Cara Mendapatkan VAPID Public Key

VAPID (Voluntary Application Server Identification) keys diperlukan untuk mengimplementasikan push notification. Berikut adalah cara mendapatkan VAPID public key:

## Dari API Dicoding Story API

API yang digunakan (`https://story-api.dicoding.dev/v1`) menyediakan endpoint untuk mendapatkan VAPID public key:

### Endpoint:
```
GET https://story-api.dicoding.dev/v1/notifications/vapid-public-key
```

### Response:
```json
{
  "publicKey": "VAPID_PUBLIC_KEY_DISINI"
}
```

### Cara Menggunakan:

1. **Otomatis**: Aplikasi akan otomatis mengambil VAPID public key dari API saat pertama kali user login dan mengizinkan push notification.

2. **Manual Testing**: Anda bisa test dengan membuka Developer Tools Browser dan menjalankan:
   ```javascript
   // Di console browser
   fetch('https://story-api.dicoding.dev/v1/notifications/vapid-public-key')
     .then(res => res.json())
     .then(data => console.log('VAPID Public Key:', data.publicKey));
   ```

## Cara Menguji Push Notification

### 1. Via Browser Developer Tools

1. Buka aplikasi di browser
2. Login ke aplikasi
3. Buka Developer Tools (F12)
4. Pergi ke tab **Application** > **Service Workers**
5. Klik **Push** untuk mengirim test notification
6. Atau gunakan console untuk trigger notification:
   ```javascript
   navigator.serviceWorker.ready.then(registration => {
     registration.showNotification('Test Notification', {
       body: 'Ini adalah test notification',
       icon: '/favicon.png',
       badge: '/favicon.png'
     });
   });
   ```

### 2. Via Server API

Server akan mengirim push notification secara otomatis ketika ada update data stories. Pastikan Anda sudah:
- Login ke aplikasi
- Memberikan permission untuk notification
- Subscribe ke push notification service

## Catatan Penting

- VAPID public key sudah terintegrasi di aplikasi melalui file `src/scripts/utils/push-notification.js`
- Aplikasi akan otomatis subscribe ke push notification setelah user login
- Push notification akan muncul bahkan ketika browser/app dalam keadaan tertutup (jika diizinkan oleh browser)

