import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { Card, Screen } from '../../components/common/Screen';
import { registerForPushNotifications } from '../../services/notificationService';
export function SettingsScreen() { const [message, setMessage] = useState(''); return <Screen title="Settings" subtitle="Device and notification preferences"><Card><Text style={{ fontWeight: '800' }}>Push notifications</Text><Pressable onPress={() => void registerForPushNotifications().then(token => setMessage(token ? 'This device is registered.' : 'Notifications are unavailable or permission was declined.')).catch(e => setMessage(e.message))}><Text style={{ color: '#2563eb', marginTop: 8 }}>Enable notifications</Text></Pressable>{message ? <Text>{message}</Text> : null}</Card></Screen>; }
