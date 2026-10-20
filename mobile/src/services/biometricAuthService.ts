/**
 * biometricAuthService.ts
 *
 * Handles the device-side logic for the true passwordless biometric login flow.
 *
 * Security model:
 *  - Raw device token stored ONLY in expo-secure-store (Android Keystore /
 *    iOS Keychain backed).  Never in AsyncStorage, SQLite, or plain storage.
 *  - Token is generated server-side at enrolment and returned once.
 *  - A stable deviceId (UUID) is generated on first enrolment, also in SecureStore.
 *  - Biometric verification happens ON DEVICE via expo-local-authentication.
 *    No fingerprint/face data ever leaves the device.
 *  - After biometric success, the raw token is sent to the backend which validates
 *    its SHA-256 hash and issues a real access + refresh token session.
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { environment } from '../config/environment';
import { AuthSession, User } from '../types/auth';
import { api, ApiError, persistTokens } from './api';

// ─── SecureStore keys ─────────────────────────────────────────────────────────
const DEVICE_TOKEN_KEY = 'tracksale.biometric.deviceToken';
const DEVICE_ID_KEY    = 'tracksale.biometric.deviceId';
const ENROLLMENT_DISMISSED_PREFIX = 'tracksale.biometric.enrollmentDismissed.';

// ─── Device ID ────────────────────────────────────────────────────────────────
// Stable UUID per install, stored in SecureStore.

async function getOrCreateDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;
  // Generate a UUID using available entropy
  const newId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
  await SecureStore.setItemAsync(DEVICE_ID_KEY, newId, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
  return newId;
}

// ─── Device name ──────────────────────────────────────────────────────────────
function getDeviceName(): string {
  const model = (Application as { deviceName?: string }).deviceName;
  if (model) return String(model).slice(0, 120);
  return Platform.OS === 'ios' ? 'iPhone / iPad' : 'Android Device';
}

// ─── Biometric availability ───────────────────────────────────────────────────
export type BiometricStatus =
  | 'available'          // hardware present + enrolled → can use
  | 'not_enrolled'       // hardware present but no biometrics set up
  | 'not_supported'      // no biometric hardware
  | 'unavailable';       // unknown / error

export async function getBiometricStatus(): Promise<BiometricStatus> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return 'not_supported';
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) return 'not_enrolled';
    return 'available';
  } catch {
    return 'unavailable';
  }
}

/** True when a device token is stored (biometric login is enrolled). */
export async function isBiometricEnrolled(): Promise<boolean> {
  const token = await SecureStore.getItemAsync(DEVICE_TOKEN_KEY);
  return Boolean(token);
}

export async function shouldOfferBiometricEnrollment(userId: string): Promise<boolean> {
  const [enrolled, dismissed, status] = await Promise.all([
    isBiometricEnrolled(),
    SecureStore.getItemAsync(`${ENROLLMENT_DISMISSED_PREFIX}${userId}`),
    getBiometricStatus(),
  ]);
  return !enrolled && !dismissed && status === 'available';
}

export async function dismissBiometricEnrollment(userId: string): Promise<void> {
  await SecureStore.setItemAsync(`${ENROLLMENT_DISMISSED_PREFIX}${userId}`, 'true', {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

// ─── Enrolment ────────────────────────────────────────────────────────────────
/**
 * Called once, right after a successful password login.
 * Registers this device with the backend and stores the returned device token
 * in SecureStore.  The user must already be authenticated (Bearer token set).
 *
 * Throws if the backend call fails; caller should let the user skip enrolment
 * gracefully on error.
 */
export async function enrollBiometric(): Promise<void> {
  const deviceId   = await getOrCreateDeviceId();
  const deviceName = getDeviceName();

  const result = await api.post<{ deviceToken: string }>(
    '/api/v1/auth/mobile-biometric/enroll',
    {
      deviceId,
      deviceName,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    },
  );

  // Store the raw token in the Secure Enclave — never anywhere else
  await SecureStore.setItemAsync(DEVICE_TOKEN_KEY, result.deviceToken, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

// ─── Passwordless login ───────────────────────────────────────────────────────
/**
 * Prompts biometric verification on device, then sends the device token to
 * the backend to obtain a full access + refresh token session.
 *
 * Returns the authenticated User on success.
 * Throws BiometricCancelledError if the user cancels.
 * Throws BiometricUnavailableError if hardware/enrolment is missing.
 * Throws ApiError for backend failures (e.g. token revoked → 401).
 */
export async function biometricLogin(promptMessage: string): Promise<User> {
  // 1. Check device-side enrolment
  const deviceToken = await SecureStore.getItemAsync(DEVICE_TOKEN_KEY);
  if (!deviceToken) throw new BiometricNotEnrolledError();

  const status = await getBiometricStatus();
  if (status !== 'available') {
    throw new BiometricUnavailableError(
      status === 'not_enrolled'
        ? 'Set up fingerprint or Face ID in device settings first.'
        : 'Biometric authentication is not available on this device.',
    );
  }

  // 2. Device-local biometric prompt — no data sent to server
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Use Password',
    disableDeviceFallback: false,
  });

  if (!result.success) {
    throw new BiometricCancelledError(
      result.error === 'user_cancel' || result.error === 'system_cancel'
        ? 'Biometric sign in was cancelled.'
        : 'Biometric verification was not recognised. Try again.',
    );
  }

  // 3. Send device token to backend → get real session (no password involved)
  const session = await api.post<AuthSession>(
    '/api/v1/auth/mobile-biometric/login',
    { deviceToken, tenant: environment.tenantSlug },
  );

  // 4. Persist the new access + refresh tokens (same as password login path)
  await persistTokens(session.accessToken, session.refreshToken);

  return { ...session.user, role: (session.user.role as string).toLowerCase() as User['role'] };
}

// ─── Revocation ───────────────────────────────────────────────────────────────
/**
 * Disables biometric login on this device.
 * Removes the device token from SecureStore and revokes it on the backend.
 * Never throws — failures are swallowed so the local clear always succeeds.
 */
export async function revokeBiometric(): Promise<void> {
  const deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY).catch(() => null);
  // Clear local token first — even if backend call fails, device is safe
  await SecureStore.deleteItemAsync(DEVICE_TOKEN_KEY).catch(() => undefined);
  if (deviceId) {
    const { environment } = await import('../config/environment');
    const { getAccessToken } = await import('./api');
    await fetch(
      `${environment.apiUrl}/api/v1/auth/mobile-biometric/enroll/${encodeURIComponent(deviceId)}`,
      {
        method: 'DELETE',
        headers: {
          'X-Client-Platform': 'mobile',
          ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
        },
      },
    ).catch(() => undefined);
  }
}

// ─── Custom error types ───────────────────────────────────────────────────────
export class BiometricNotEnrolledError extends Error {
  constructor() {
    super('Biometric login is not set up on this device. Sign in with your password first.');
    this.name = 'BiometricNotEnrolledError';
  }
}

export class BiometricCancelledError extends Error {
  constructor(message = 'Biometric sign in was cancelled.') {
    super(message);
    this.name = 'BiometricCancelledError';
  }
}

export class BiometricUnavailableError extends Error {
  constructor(message = 'Biometric authentication is not available.') {
    super(message);
    this.name = 'BiometricUnavailableError';
  }
}

/** True when the error means "fall back to password" rather than "show error". */
export function isBiometricFallback(err: unknown): boolean {
  return (
    err instanceof BiometricCancelledError ||
    err instanceof BiometricNotEnrolledError ||
    err instanceof BiometricUnavailableError ||
    (err instanceof ApiError && err.status === 401)
  );
}
