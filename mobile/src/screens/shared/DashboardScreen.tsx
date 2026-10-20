import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Text } from 'react-native';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Screen } from '../../components/common/Screen';
import { SyncBanner } from '../../components/offline/SyncBanner';
import { BiometricAttendanceCard } from '../../components/attendance/BiometricAttendanceCard';

export function DashboardScreen() {
  const { user } = useAuth();
  const endpoint = user?.role === 'factory_manager' ? '/api/v1/factory/dashboard' : '/api/v1/analytics/dashboard';
  const { data } = useQuery({ queryKey: ['dashboard', user?.role], queryFn: () => api.get<Record<string, unknown>>(endpoint) });
  const summary = (data?.kpis ?? data) as Record<string, unknown> | undefined;
  const label = user?.role === 'manager' ? 'Project Manager' : user?.role === 'factory_manager' ? 'Factory Manager' : 'Sales Person';
  return <><SyncBanner /><Screen title={`Hello, ${user?.name?.split(' ')[0] ?? ''}`} subtitle={`${label} dashboard`}>{user?.role === 'agent' ? <BiometricAttendanceCard /> : null}{summary ? Object.entries(summary).filter(([, value]) => ['string', 'number'].includes(typeof value)).slice(0, 8).map(([key, value]) => <Card key={key}><Text style={{ color: '#64748b' }}>{key.replace(/([A-Z])/g, ' $1')}</Text><Text style={{ fontSize: 24, fontWeight: '800' }}>{String(value)}</Text></Card>) : <Card><Text>Dashboard information will appear when connected.</Text></Card>}</Screen></>;
}
