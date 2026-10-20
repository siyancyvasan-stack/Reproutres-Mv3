import NetInfo from '@react-native-community/netinfo';
import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { flushGpsOutbox, reconcileBackgroundTracking, sendTrackingHeartbeat, stopBackgroundTracking } from '../../services/backgroundTracking';

export function TrackingCoordinator() {
  const { user, status } = useAuth();

  useEffect(() => {
    if (status !== 'signedIn' || user?.role !== 'agent') {
      if (status === 'signedOut') void stopBackgroundTracking().catch(() => undefined);
      return;
    }
    let disposed = false;
    const reconcile = async () => {
      try {
        const attendance = await api.get<{ checkedIn: boolean }>('/api/v1/attendance/status');
        if (!disposed) await reconcileBackgroundTracking(user.id, attendance.checkedIn);
      } catch {
        await sendTrackingHeartbeat().catch(() => undefined);
      }
    };
    void reconcile();
    const interval = setInterval(() => void reconcile(), 30_000);
    const appState = AppState.addEventListener('change', next => {
      if (next === 'active') void reconcile();
      else void sendTrackingHeartbeat().catch(() => undefined);
    });
    const network = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable !== false) void flushGpsOutbox(user.id);
    });
    return () => {
      disposed = true;
      clearInterval(interval);
      appState.remove();
      network();
    };
  }, [status, user?.id, user?.role]);

  return null;
}
