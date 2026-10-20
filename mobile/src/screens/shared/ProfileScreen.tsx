import React from 'react';
import { Pressable, Text } from 'react-native';
import { Card, Screen } from '../../components/common/Screen';
import { useAuth } from '../../contexts/AuthContext';
export function ProfileScreen() { const { user, signOut } = useAuth(); return <Screen title="Profile"><Card><Text style={{ fontSize: 20, fontWeight: '800' }}>{user?.name}</Text><Text>{user?.email}</Text><Text>{user?.role}</Text></Card><Pressable onPress={() => void signOut()} style={{ backgroundColor: '#fee2e2', padding: 16, borderRadius: 14 }}><Text style={{ color: '#b91c1c', fontWeight: '800', textAlign: 'center' }}>Sign out</Text></Pressable></Screen>; }
