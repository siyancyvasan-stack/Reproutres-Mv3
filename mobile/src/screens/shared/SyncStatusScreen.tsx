import React from 'react';
import { Pressable, Text } from 'react-native';
import { Card, Screen } from '../../components/common/Screen';
import { useSync } from '../../contexts/SyncContext';
export function SyncStatusScreen() { const sync = useSync(); return <Screen title="Sync status"><Card><Text>Network: {sync.online ? 'Online' : 'Offline'}</Text><Text>Queued: {sync.pendingCount}</Text><Text>Needs attention: {sync.failedCount}</Text><Text>Last sync: {sync.lastSyncedAt ? new Date(sync.lastSyncedAt).toLocaleString() : 'Not yet'}</Text></Card><Pressable onPress={() => void sync.syncNow()} style={{ padding: 16, backgroundColor: '#dbeafe', borderRadius: 14 }}><Text style={{ textAlign: 'center', color: '#1d4ed8', fontWeight: '800' }}>Sync now</Text></Pressable></Screen>; }
