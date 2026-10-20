import React, { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function Screen({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle?: string }>) {
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content}><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}{children}</ScrollView></SafeAreaView>;
}
export function Card({ children }: PropsWithChildren) { return <View style={styles.card}>{children}</View>; }
export const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#f8fafc' }, content: { padding: 20, gap: 14 }, title: { fontSize: 28, fontWeight: '800', color: '#0f172a' }, subtitle: { fontSize: 15, color: '#64748b' }, card: { padding: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 8 } });
