import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

export interface FCMTokenResult {
  token: string | null;
  status: 'granted' | 'denied' | 'unsupported';
}

/**
 * Register device for Push Notifications via Firebase Cloud Messaging (FCM)
 */
export async function registerForPushNotificationsAsync(): Promise<FCMTokenResult> {
  if (Platform.OS === 'web') {
    return { token: 'mock-web-fcm-token-' + Date.now(), status: 'granted' };
  }

  if (!Device.isDevice) {
    console.warn('[FCM] Push notifications require a physical device');
    return { token: 'simulated-simulator-fcm-token', status: 'granted' };
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return { token: null, status: 'denied' };
    }

    // Android notification channel for High-Priority Road Hazard Alerts
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('nirvana-corridor-alerts', {
        name: 'NIRVANA Emergency Road Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#ef4444',
      });
    }

    // Get FCM Token
    const tokenData = await Notifications.getDevicePushTokenAsync();
    console.log('[FCM] Device Push Token retrieved:', tokenData.data);

    return { token: tokenData.data, status: 'granted' };
  } catch (error) {
    console.warn('[FCM] Error getting push token:', error);
    return { token: null, status: 'unsupported' };
  }
}

/**
 * Dispatches an emergency corridor notification locally or simulates an incoming FCM broadcast
 */
export async function sendCorridorAlert(title: string, body: string, corridorCode: string = 'NH-10') {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { corridorCode, type: 'emergency_blockage' },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Send immediately
    });
  } catch (e) {
    console.warn('[Notifications] Could not trigger local notification:', e);
  }
}
