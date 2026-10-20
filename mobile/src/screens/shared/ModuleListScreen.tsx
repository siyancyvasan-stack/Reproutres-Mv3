import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { api } from '../../services/api';
import { cacheData, readCache } from '../../database';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Screen } from '../../components/common/Screen';
import { SyncBanner } from '../../components/offline/SyncBanner';

type Props = { title: string; subtitle?: string; endpoint?: string; onItemPress?: (item: Record<string, unknown>) => void };
export function ModuleListScreen({ title, subtitle, endpoint, onItemPress }: Props) {
  const { user } = useAuth(); const key = endpoint ?? title;
  const query = useQuery({ queryKey: [user?.id, key], enabled: Boolean(user && endpoint), queryFn: async () => { const result = await api.get<unknown>(endpoint!); cacheData(user!.id, key, result); return result; }, placeholderData: () => user ? readCache(user.id, key) : undefined });
  const raw = query.data as { items?: Record<string, unknown>[] } | Record<string, unknown>[] | undefined;
  const items = Array.isArray(raw) ? raw : raw?.items ?? [];
  return <><SyncBanner /><Screen title={title} subtitle={subtitle}>{query.isLoading ? <ActivityIndicator /> : null}{query.error ? <Card><Text>Showing saved data. Pull online to refresh.</Text></Card> : null}{items.length ? items.map((item, index) => <Pressable key={String(item.id ?? index)} onPress={() => onItemPress?.(item)}><Card><Text style={{ fontWeight: '800', fontSize: 16 }}>{String(item.name ?? item.title ?? item.shopName ?? item.sku ?? `Item ${index + 1}`)}</Text><Text style={{ color: '#64748b' }}>{String(item.status ?? item.priority ?? item.category ?? '')}</Text></Card></Pressable>) : !query.isLoading ? <Card><Text>No records to show.</Text></Card> : null}</Screen></>;
}
