import { OneSignal } from 'react-native-onesignal';

class PushNotificationService {
  private isInitialized = false;

  async initialize(userId?: string): Promise<string | null> {
    if (this.isInitialized) {
      return null;
    }

    try {
      console.log('🔄 Initializing OneSignal...');
      
      // Initialize OneSignal with your App ID
      OneSignal.initialize('06961183-afb4-4fc6-9358-6b40f4c2780a');
      
      // THIS IS KEY: Request permission explicitly
      const permission = await OneSignal.Notifications.requestPermission(true);
      console.log('📱 OneSignal permission granted:', permission);
      
      // Set external user ID to link with your user system
      if (userId) {
        OneSignal.login(userId);
        console.log('👤 OneSignal user logged in:', userId);
      }
      
      // Check subscription status
      const subscriptionState = OneSignal.User.pushSubscription;
      console.log('✅ OneSignal subscription state:', {
        id: subscriptionState.id,
        optedIn: subscriptionState.optedIn,
        token: subscriptionState.token
      });
      
      this.isInitialized = true;
      return subscriptionState.id;
      
    } catch (error) {
      console.error('❌ OneSignal initialization failed:', error);
      return null;
    }
  }

  setupNotificationListeners() {
    OneSignal.Notifications.addEventListener('click', (event) => {
      console.log('👆 OneSignal notification clicked:', event);
    });

    OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
      console.log('📱 OneSignal notification received in foreground:', event);
      event.preventDefault();
      event.notification.display();
    });
  }

  getPushToken(): string | null {
    return OneSignal.User.pushSubscription.id;
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
