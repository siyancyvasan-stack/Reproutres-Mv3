import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSync } from '../../contexts/SyncContext';

export function SyncBanner() {
  const sync = useSync();
  return <View style={[styles.root, !sync.online && styles.offline]}><Text style={styles.text}>{!sync.online ? `Offline · ${sync.pendingCount} queued` : sync.syncing ? 'Syncing…' : sync.failedCount ? `${sync.failedCount} need attention` : sync.pendingCount ? `${sync.pendingCount} waiting` : 'Up to date'}</Text>{sync.online && (sync.pendingCount > 0 || sync.failedCount > 0) ? <Pressable onPress={() => void sync.syncNow()}><Text style={styles.action}>Sync</Text></Pressable> : null}</View>;
}
const styles = StyleSheet.create({ root: { paddingHorizontal: 16, paddingVertical: 7, backgroundColor: '#dcfce7', flexDirection: 'row', justifyContent: 'space-between' }, offline: { backgroundColor: '#fef3c7' }, text: { fontSize: 12, fontWeight: '600', color: '#334155' }, action: { color: '#2563eb', fontWeight: '700' } });
