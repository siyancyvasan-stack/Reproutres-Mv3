import { environment } from '../config/environment';
import { AuthSession, User } from '../types/auth';
import { api, clearTokens, persistTokens } from './api';
import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'tracksale.refreshToken';

export async function login(email: string, password: string) {
  const session = await api.post<AuthSession>('/api/v1/auth/login', {
    email: email.trim().toLowerCase(), password, tenant: environment.tenantSlug,
  });
  await persistTokens(session.accessToken, session.refreshToken);
  return session.user;
}

export async function currentUser() {
  const result = await api.get<{ user: User & { role: string } }>('/api/v1/auth/me');
  return { ...result.user, role: result.user.role.toLowerCase() } as User;
}

export async function logout() {
  // Send the stored refresh token so the backend can revoke it (fixes silent logout bug)
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY).catch(() => null);
  await api.post<void>('/api/v1/auth/logout', refreshToken ? { refreshToken } : {}).catch(() => undefined);
  await clearTokens();
}
