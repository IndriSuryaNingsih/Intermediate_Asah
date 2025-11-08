import Api from '../data/api';

class PushNotification {
  constructor() {
    this.vapidPublicKey = null;
    this.subscription = null;
  }

  // Get VAPID public key from API
  async getVapidPublicKey() {
    if (this.vapidPublicKey) {
      return this.vapidPublicKey;
    }

    try {
      const response = await Api.getVapidPublicKey();
      // VAPID key bisa dalam format { publicKey: "..." } atau langsung string
      this.vapidPublicKey = response.publicKey || response.vapidPublicKey || response;
      return this.vapidPublicKey;
    } catch (error) {
      console.warn('Error getting VAPID public key (endpoint mungkin tidak tersedia):', error.message);
      // Return null instead of throwing to allow app to continue
      return null;
    }
  }

  // Convert VAPID key to Uint8Array
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Subscribe to push notifications
  async subscribe() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported');
      return null;
    }

    try {
      // Check if already subscribed
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();

      if (existingSubscription) {
        console.log('Already subscribed to push notifications');
        this.subscription = existingSubscription;
        return existingSubscription;
      }

      // Get VAPID public key
      const vapidPublicKey = await this.getVapidPublicKey();
      if (!vapidPublicKey) {
        console.warn('VAPID public key tidak tersedia, skip push notification subscription');
        return null;
      }

      // Convert VAPID key
      const applicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey);

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey,
      });

      console.log('Subscribed to push notifications:', subscription);

      // Send subscription to server - WAJIB untuk memenuhi kriteria
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const subscriptionData = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
              auth: arrayBufferToBase64(subscription.getKey('auth')),
            },
          };
          
          console.log('Sending subscription to server:', subscriptionData);
          const response = await Api.subscribeNotification(subscriptionData);
          console.log('Subscription sent to server successfully:', response);
        } catch (error) {
          console.error('Error sending subscription to server:', error);
          // Re-throw error to ensure it's visible
          throw new Error(`Gagal mengirim subscription ke server: ${error.message}`);
        }
      } else {
        console.warn('No token found, skipping server subscription');
      }

      this.subscription = subscription;
      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        console.log('Unsubscribed from push notifications');
        this.subscription = null;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      throw error;
    }
  }

  // Request notification permission
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('Notifications are not supported');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
}

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export default new PushNotification();

