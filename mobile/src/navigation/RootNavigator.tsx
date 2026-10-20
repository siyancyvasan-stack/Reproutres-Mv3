import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PortalWebViewScreen } from '../screens/web/PortalWebViewScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { useAuth } from '../contexts/AuthContext';
import { FactoryManagerNavigator, ProjectManagerNavigator, SalesPersonNavigator } from './RoleNavigators';

const Tab = createBottomTabNavigator();

function NativeRoleNavigator() {
  const { user } = useAuth();
  if (user?.role === 'factory_manager') return <FactoryManagerNavigator />;
  if (user?.role === 'agent') return <SalesPersonNavigator />;
  return <ProjectManagerNavigator />;
}

export function RootNavigator() {
  const { status, user, biometricEnrollmentPending, enrollBiometric, dismissBiometricEnrollment } = useAuth();
  if (status === 'restoring') return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" /></View>;
  if (status === 'signedOut' || !user) return <LoginScreen />;
  const dashboard = user.role === 'admin' ? <PortalWebViewScreen /> : <NavigationContainer>
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Portal" component={PortalWebViewScreen} />
      <Tab.Screen name="Native" component={NativeRoleNavigator} />
    </Tab.Navigator>
  </NavigationContainer>;
  return <>
    {dashboard}
    <BiometricEnrollmentModal
      visible={biometricEnrollmentPending}
      onEnable={enrollBiometric}
      onDismiss={dismissBiometricEnrollment}
    />
  </>;
}

function BiometricEnrollmentModal({ visible, onEnable, onDismiss }: {
  visible: boolean;
  onEnable: () => Promise<void>;
  onDismiss: () => Promise<void>;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const enable = async () => {
    setBusy(true);
    setError('');
    try { await onEnable(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to enable biometric login.'); }
    finally { setBusy(false); }
  };
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !busy && void onDismiss()}>
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.icon}>◉</Text>
        <Text style={styles.title}>Enable Fingerprint / Face ID</Text>
        <Text style={styles.description}>Sign in faster next time. Your biometric data stays on this device and is never sent to Reproutes.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable disabled={busy} onPress={() => void enable()} style={styles.enableButton}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.enableText}>Enable Biometric Login</Text>}
        </Pressable>
        <Pressable disabled={busy} onPress={() => void onDismiss()} style={styles.dismissButton}>
          <Text style={styles.dismissText}>Not Now</Text>
        </Pressable>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(15,23,42,.72)' },
  card: { width: '100%', maxWidth: 420, alignItems: 'center', borderRadius: 24, backgroundColor: '#fff', padding: 24 },
  icon: { color: '#0891b2', fontSize: 44, fontWeight: '900' },
  title: { marginTop: 12, color: '#0f172a', textAlign: 'center', fontSize: 20, fontWeight: '900' },
  description: { marginTop: 10, color: '#64748b', textAlign: 'center', fontSize: 13, lineHeight: 20 },
  error: { marginTop: 12, color: '#be123c', textAlign: 'center', fontSize: 12, fontWeight: '700' },
  enableButton: { marginTop: 20, minHeight: 52, width: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#2563eb' },
  enableText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  dismissButton: { paddingHorizontal: 20, paddingTop: 16 },
  dismissText: { color: '#64748b', fontSize: 13, fontWeight: '700' },
});
