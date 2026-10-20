import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
import { io, Socket } from 'socket.io-client';
import { AppState, Platform } from 'react-native';
import { dueGpsPoints, initializeDatabase, queueGpsPoint, removeGpsPoints, retryGpsPoint } from '../database';
import { environment } from '../config/environment';
import { api, apiRequest, getAccessToken } from './api';

export const BACKGROUND_LOCATION_TASK = 'tracksale-background-location';
const TRACKING_USER_KEY = 'tracksale.trackingUserId';
const TRACKING_ACTIVE_KEY = 'tracksale.trackingActive';
let socket: Socket | undefined;
let flushing = false;

const uuid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
const batteryPercent = async () => {
  const level = await Battery.getBatteryLevelAsync().catch(() => -1);
  return level >= 0 ? Math.round(level * 100) : undefined;
};

const permissionState = async () => {
  const [permission, servicesEnabled] = await Promise.all([
    Location.getBackgroundPermissionsAsync(),
    Location.hasServicesEnabledAsync().catch(() => false),
  ]);
  const normalized = permission.status === Location.PermissionStatus.GRANTED
    ? 'granted' : permission.status === Location.PermissionStatus.DENIED ? 'denied' : 'prompt';
  return { permission: normalized as 'granted' | 'denied' | 'prompt', servicesEnabled };
};

export async function sendTrackingHeartbeat(lastLocalFixAt?: string) {
  const state = await permissionState();
  await api.post('/api/v1/tracking/heartbeat', {
    ...state,
    battery: await batteryPercent(),
    appState: AppState.currentState === 'active' ? 'active' : 'background',
    lastLocalFixAt,
  });
}

export async function flushGpsOutbox(userId: string) {
  if (flushing) return;
  flushing = true;
  try {
    for (;;) {
      const queued = dueGpsPoints(userId, 100);
      if (!queued.length) break;
      try {
        const response = await api.post<{ results: Array<{ ok: boolean; clientPointId?: string; error?: string }> }>(
          '/api/v1/tracking/points/batch', { points: queued.map(point => point.payload) },
        );
        const acknowledged = response.results.filter(result => result.ok && result.clientPointId).map(result => result.clientPointId!);
        removeGpsPoints(acknowledged);
        const byId = new Map(queued.map(point => [point.clientPointId, point]));
        response.results.filter(result => !result.ok && result.clientPointId).forEach(result => {
          const point = byId.get(result.clientPointId!);
          if (point) retryGpsPoint(point, result.error ?? 'Upload rejected');
        });
        if (!acknowledged.length) break;
      } catch (error) {
        queued.forEach(point => retryGpsPoint(point, error instanceof Error ? error.message : 'Network unavailable'));
        break;
      }
    }
  } finally {
    flushing = false;
  }
}

const ensureSocket = () => {
  const token = getAccessToken();
  if (!token || socket?.connected) return;
  if (!socket) {
    socket = io(environment.apiUrl, {
      transports: ['websocket'], autoConnect: false, reconnection: true,
      reconnectionDelay: 1_000, reconnectionDelayMax: 30_000, randomizationFactor: 0.5,
      auth: { token }, extraHeaders: { 'X-Client-Platform': 'mobile' },
    });
    socket.on('connect_error', async error => {
      if (!/auth|token|unauth/i.test(error.message)) return;
      await api.get('/api/v1/auth/me').catch(() => undefined);
      socket!.auth = { token: getAccessToken() };
    });
  }
  socket.auth = { token };
  socket.connect();
};

const handleLocations = async (locations: Location.LocationObject[]) => {
  initializeDatabase();
  const userId = await SecureStore.getItemAsync(TRACKING_USER_KEY);
  if (!userId) return;
  const battery = await batteryPercent();
  for (const location of locations) {
    const capturedAt = new Date(location.timestamp).toISOString();
    const clientPointId = uuid();
    const payload = {
      clientPointId, latitude: location.coords.latitude, longitude: location.coords.longitude,
      accuracy: Math.max(1, location.coords.accuracy ?? 500), heading: location.coords.heading ?? undefined,
      speedKmH: location.coords.speed == null || location.coords.speed < 0 ? undefined : location.coords.speed * 3.6,
      altitude: location.coords.altitude ?? undefined, battery, deviceTimestamp: capturedAt,
    };
    queueGpsPoint({ clientPointId, userId, payload, capturedAt, attemptCount: 0, nextAttemptAt: capturedAt });
    if (socket?.connected) socket.emit('tracking:update', payload);
  }
  ensureSocket();
  await flushGpsOutbox(userId);
  await sendTrackingHeartbeat(locations.at(-1) ? new Date(locations.at(-1)!.timestamp).toISOString() : undefined).catch(() => undefined);
};

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    await sendTrackingHeartbeat().catch(() => undefined);
    return;
  }
  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations ?? [];
  if (locations.length) await handleLocations(locations);
});

export async function startBackgroundTracking(userId: string) {
  await SecureStore.setItemAsync(TRACKING_USER_KEY, userId);
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== Location.PermissionStatus.GRANTED) {
    await sendTrackingHeartbeat().catch(() => undefined);
    throw new Error('Location permission is required for shift tracking.');
  }
  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== Location.PermissionStatus.GRANTED) {
    await sendTrackingHeartbeat().catch(() => undefined);
    throw new Error('Always/background location permission is required for reliable tracking.');
  }
  if (!await Location.hasServicesEnabledAsync()) {
    await sendTrackingHeartbeat().catch(() => undefined);
    throw new Error('Turn on device location services to start tracking.');
  }
  if (!await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Highest,
      timeInterval: 30_000,
      distanceInterval: 0,
      deferredUpdatesInterval: 30_000,
      deferredUpdatesDistance: 25,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      activityType: Location.ActivityType.AutomotiveNavigation,
      foregroundService: Platform.OS === 'android' ? {
        notificationTitle: 'TrackSale shift tracking active',
        notificationBody: 'Your route is being recorded for the active work shift.',
        notificationColor: '#2563eb',
        killServiceOnDestroy: false,
      } : undefined,
    });
  }
  await SecureStore.setItemAsync(TRACKING_ACTIVE_KEY, 'true');
  ensureSocket();
  await sendTrackingHeartbeat();
  await flushGpsOutbox(userId);
}

export async function stopBackgroundTracking() {
  if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
  await SecureStore.deleteItemAsync(TRACKING_ACTIVE_KEY);
  await SecureStore.deleteItemAsync(TRACKING_USER_KEY);
  socket?.disconnect();
}

export async function reconcileBackgroundTracking(userId: string, checkedIn: boolean) {
  if (checkedIn) await startBackgroundTracking(userId);
  else await stopBackgroundTracking();
}

export const trackingWasActive = async () => (await SecureStore.getItemAsync(TRACKING_ACTIVE_KEY)) === 'true';
