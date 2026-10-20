import NetInfo from '@react-native-community/netinfo';
import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { initializeDatabase, pendingOperations, queueOperation } from '../database';
import { useAuth } from './AuthContext';
import { createOperation, syncPending } from '../services/syncService';
import { OperationKind } from '../types/offline';

type SyncValue = {
  online: boolean;
  syncing: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncedAt?: string;
  enqueue(kind: OperationKind, method: 'POST' | 'PATCH', path: string, payload: unknown): Promise<void>;
  syncNow(): Promise<void>;
};
const SyncContext = createContext<SyncValue | null>(null);

export function SyncProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>();
  useEffect(() => { initializeDatabase(); }, []);
  const refreshCounts = () => {
    const operations = user ? pendingOperations(user.id) : [];
    setPendingCount(operations.filter(op => op.status !== 'FAILED').length);
    setFailedCount(operations.filter(op => op.status === 'FAILED').length);
  };
  const syncNow = async () => {
    if (!user || !online || syncing) return;
    setSyncing(true);
    try { await syncPending(user.id); setLastSyncedAt(new Date().toISOString()); } finally { setSyncing(false); refreshCounts(); }
  };
  useEffect(() => NetInfo.addEventListener(state => { const next = Boolean(state.isConnected && state.isInternetReachable !== false); setOnline(next); }), []);
  useEffect(() => { refreshCounts(); if (online) void syncNow(); }, [online, user?.id]);
  const value = useMemo<SyncValue>(() => ({ online, syncing, pendingCount, failedCount, lastSyncedAt,
    enqueue: async (kind, method, path, payload) => { if (!user) throw new Error('Sign in required'); queueOperation(createOperation(user.id, kind, method, path, payload)); refreshCounts(); if (online) await syncNow(); },
    syncNow,
  }), [online, syncing, pendingCount, failedCount, lastSyncedAt, user]);
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() { const value = useContext(SyncContext); if (!value) throw new Error('useSync must be used within SyncProvider'); return value; }
