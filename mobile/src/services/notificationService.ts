import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { environment } from '../config/environment';
import { api } from './api';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }) });

export async function registerForPushNotifications() {
  if (!Device.isDevice || !environment.easProjectId) return undefined;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'TrackSale notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563eb',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return undefined;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId: environment.easProjectId })).data;
  await api.post('/api/v1/mobile/devices', { token, provider: 'EXPO', platform: Device.osName, deviceName: Device.modelName });
  return token;
}
