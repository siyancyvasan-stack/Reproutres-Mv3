import Constants from 'expo-constants';

type Extra = { apiUrl?: string; webUrl?: string; tenantSlug?: string; eas?: { projectId?: string } };
const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
const apiUrl = extra.apiUrl?.trim().replace(/\/$/, '');

if (!apiUrl) {
  throw new Error('TrackSale mobile API URL is not configured. Set EXPO_PUBLIC_API_URL before starting the app.');
}

export const environment = {
  apiUrl,
  webUrl: extra.webUrl?.trim().replace(/\/$/, '') || apiUrl.replace(/:4001$/, ':4000'),
  tenantSlug: extra.tenantSlug ?? 'reproutes-demo',
  easProjectId: extra.eas?.projectId ?? '',
};
