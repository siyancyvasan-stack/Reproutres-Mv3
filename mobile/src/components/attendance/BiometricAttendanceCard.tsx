import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../../services/api';

type AttendanceStatus = {
  checkedIn: boolean;
  shiftStatus: 'ACTIVE' | 'ON_BREAK' | 'OFFLINE' | string;
  attendance?: { checkInAt?: string } | null;
};

const biometricLabel = (types: LocalAuthentication.AuthenticationType[]) =>
  types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) ? 'Face ID' :
    types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT) ? 'fingerprint' : 'device PIN';

async function verifiedLocation() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) throw new Error('Location permission is required.');
  if (!await Location.hasServicesEnabledAsync()) throw new Error('Turn on device location services.');
  const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
  if ((location.coords.accuracy ?? 999) > 100) throw new Error('GPS accuracy is weak. Move outdoors and retry.');
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: Math.max(1, location.coords.accuracy ?? 100),
    speedKmH: location.coords.speed == null || location.coords.speed < 0 ? undefined : location.coords.speed * 3.6,
    heading: location.coords.heading ?? undefined,
    altitude: location.coords.altitude ?? undefined,
    deviceTimestamp: new Date(location.timestamp).toISOString(),
    locationPermission: 'granted' as const,
  };
}

function FingerprintMark({ active }: { active: boolean }) {
  return <View style={[styles.fingerprint, active && styles.fingerprintActive]}>
    <View style={[styles.ridge, styles.ridgeOuter]} />
    <View style={[styles.ridge, styles.ridgeMiddle]} />
    <View style={[styles.ridge, styles.ridgeInner]} />
    <View style={styles.fingerprintStem} />
  </View>;
}

export function BiometricAttendanceCard() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['attendance-status'],
    queryFn: () => api.get<AttendanceStatus>('/api/v1/attendance/status'),
    refetchInterval: 30_000,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Tap fingerprint to verify');

  const act = async () => {
    setBusy(true);
    try {
      const [hardware, enrolled, types] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.supportedAuthenticationTypesAsync(),
      ]);
      if (!hardware || !enrolled) throw new Error('Set up fingerprint, Face ID, or a device lock first.');
      const method = biometricLabel(types);
      setMessage(`Verify with ${method}`);
      const verified = await LocalAuthentication.authenticateAsync({
        promptMessage: data?.checkedIn ? 'Verify to punch out' : 'Verify to punch in',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      if (!verified.success) throw new Error('Identity verification was cancelled or unsuccessful.');
      setMessage('Getting accurate GPS location…');
      const gps = await verifiedLocation();
      await api.post(data?.checkedIn ? '/api/v1/attendance/check-out' : '/api/v1/attendance/check-in', gps);
      setMessage(data?.checkedIn ? 'Shift completed successfully' : 'Shift started • GPS tracking active');
      await Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: ['dashboard'] })]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update attendance.');
    } finally {
      setBusy(false);
    }
  };

  const checkedIn = Boolean(data?.checkedIn);
  return <View style={[styles.card, checkedIn && styles.cardActive]}>
    <Text style={styles.eyebrow}>SECURE ATTENDANCE</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={checkedIn ? 'Verify identity and punch out' : 'Verify identity and punch in'} disabled={busy || isLoading} onPress={() => void act()} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      {busy || isLoading ? <ActivityIndicator size="large" color="#818cf8" /> : <FingerprintMark active={checkedIn} />}
    </Pressable>
    <Text style={[styles.title, checkedIn && styles.titleActive]}>{checkedIn ? 'Punch Out' : 'Punch In to Start Shift'}</Text>
    <Text style={styles.message}>{message}</Text>
    {checkedIn && data?.attendance?.checkInAt ? <Text style={styles.time}>Started {new Date(data.attendance.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { padding: 20, borderRadius: 22, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#312e81', alignItems: 'center', gap: 8 },
  cardActive: { borderColor: '#047857' },
  eyebrow: { color: '#94a3b8', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  action: { width: 104, height: 104, borderRadius: 52, marginVertical: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827', borderWidth: 2, borderColor: '#4338ca' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  fingerprint: { width: 58, height: 66, alignItems: 'center', justifyContent: 'center' },
  fingerprintActive: { transform: [{ scale: 1.04 }] },
  ridge: { position: 'absolute', borderWidth: 3, borderColor: '#a5b4fc', borderBottomColor: 'transparent' },
  ridgeOuter: { width: 56, height: 64, borderRadius: 28 },
  ridgeMiddle: { width: 40, height: 50, borderRadius: 20, top: 10 },
  ridgeInner: { width: 24, height: 36, borderRadius: 12, top: 19 },
  fingerprintStem: { position: 'absolute', bottom: 0, width: 3, height: 26, borderRadius: 2, backgroundColor: '#a5b4fc' },
  title: { color: '#fff', fontSize: 18, fontWeight: '900' },
  titleActive: { color: '#6ee7b7' },
  message: { color: '#cbd5e1', textAlign: 'center', fontSize: 13 },
  time: { color: '#6ee7b7', fontSize: 12, fontWeight: '800' },
});
