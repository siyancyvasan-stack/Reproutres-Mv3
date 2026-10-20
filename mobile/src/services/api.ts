import * as SecureStore from 'expo-secure-store';
import { environment } from '../config/environment';

const ACCESS_TOKEN_KEY = 'tracksale.accessToken';
const REFRESH_TOKEN_KEY = 'tracksale.refreshToken';
let accessToken: string | null = null;
let onUnauthorized: (() => void) | undefined;

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

export const setUnauthorizedHandler = (handler?: () => void) => { onUnauthorized = handler; };
export const getAccessToken = () => accessToken;

export async function persistTokens(token: string, refreshToken?: string) {
  accessToken = token;
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  if (refreshToken) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export async function restoreAccessToken() {
  accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  return accessToken;
}

export async function clearTokens() {
  accessToken = null;
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

async function refresh() {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;
  const response = await fetch(`${environment.apiUrl}/api/v1/auth/refresh`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) return false;
  const session = await response.json();
  await persistTokens(session.accessToken, session.refreshToken ?? refreshToken);
  return true;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('X-Client-Platform', 'mobile');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${environment.apiUrl}${path}`, { ...init, headers });
  if (response.status === 401 && retry && !path.includes('/auth/') && await refresh()) {
    return apiRequest<T>(path, init, false);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => undefined);
    if (response.status === 401) onUnauthorized?.();
    throw new ApiError(response.status, body?.error?.code ?? 'API_REQUEST_FAILED', body?.error?.message ?? `Request failed (${response.status})`, body?.error?.details);
  }
  return response.status === 204 ? undefined as T : response.json();
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, payload: unknown) => apiRequest<T>(path, { method: 'POST', body: JSON.stringify(payload) }),
  patch: <T>(path: string, payload: unknown) => apiRequest<T>(path, { method: 'PATCH', body: JSON.stringify(payload) }),
  put: <T>(path: string, payload: unknown) => apiRequest<T>(path, { method: 'PUT', body: JSON.stringify(payload) }),
};
