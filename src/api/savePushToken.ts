// src/services/PushNotificationService.ts
import { OneSignal } from 'react-native-onesignal';
import { ONESIGNAL_APP_ID } from '@env'; // Import your App ID from .env

class PushNotificationService {
  /**
   * Initializes the OneSignal SDK and sets up listeners.
   * This should be called once when the app starts.
   */
  initialize = () => {
    if (!ONESIGNAL_APP_ID) {
      console.error("ONESIGNAL_APP_ID is not set in .env file.");
      return;
    }

    // Initialize OneSignal
    OneSignal.initialize(ONESIGNAL_APP_ID);

    // Optional: Add listeners for notifications
    OneSignal.Notifications.addEventListener('received', (event) => {
      console.log('OneSignal: notification received:', event);
    });

    OneSignal.Notifications.addEventListener('opened', (event) => {
      console.log('OneSignal: notification opened:', event);
    });

    // We recommend requesting permission on iOS after a user interaction
    // to increase the likelihood of them accepting.
    OneSignal.Notifications.requestPermission(true);
  };

  /**
   * Logs in the user with your internal user ID to associate the push token.
   * @param externalUserId Your internal user ID (e.g., appwriteUserId)
   */
  login = (externalUserId: string) => {
    OneSignal.login(externalUserId);
  };

  /**
   * Logs the user out of OneSignal.
   */
  logout = () => {
    OneSignal.logout();
  };

  /**
   * Gets the push subscription ID (the push token).
   * This is the equivalent of your old registerForPushNotificationsAsync function.
   * @returns The push token (subscription ID) or null if not available.
   */
  getPushToken = async (): Promise<string | null> => {
    const pushSubscription = OneSignal.User.pushSubscription;

    if (pushSubscription.id) {
        console.log('📱 OneSignal Push Token:', pushSubscription.id);
        return pushSubscription.id;
    }
    
    // If the ID is not immediately available, wait for it
    return new Promise((resolve) => {
        const observer = (state: any) => {
            if (state.current.id) {
                console.log('📱 OneSignal Push Token (from observer):', state.current.id);
                resolve(state.current.id);
                pushSubscription.removeObserver(observer);
            }
        };
        pushSubscription.addObserver(observer);
    });
  };
}

// Export a singleton instance of the service
export default new PushNotificationService();
