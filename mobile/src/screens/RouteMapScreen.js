import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { getRoute } from '../api/routes';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { colors, spacing, typography } from '../theme/tokens';

export default function RouteMapScreen() {
  const [route, setRoute] = useState(null);
  useEffect(() => { getRoute(new Date().toISOString().slice(0, 10)).then(setRoute).catch(() => {}); }, []);
  if (!route) return <EmptyState title="No route data yet" message="Route coordinates will appear here after you start your shift." />;
  return <SafeAreaView style={styles.container}><View style={styles.header}><Text style={styles.eyebrow}>SHIFT SUMMARY</Text><Text style={styles.title}>Today’s route</Text><Text style={styles.subtitle}>Your route coordinates are syncing in the background.</Text></View><View style={styles.grid}><Card style={styles.stat}><Text style={styles.value}>{route.pings?.length || 0}</Text><Text style={styles.label}>GPS pings</Text></Card><Card style={styles.stat}><Text style={styles.value}>{route.visitedOutletIds?.length || 0}</Text><Text style={styles.label}>Visited</Text></Card><Card style={styles.stat}><Text style={styles.value}>{route.plannedOutletIds?.length || 0}</Text><Text style={styles.label}>Planned</Text></Card></View><Card style={styles.info}><Text style={styles.infoTitle}>Route tracking active</Text><Text style={styles.infoText}>The interactive map view can be added when a map provider is connected. Your route data is still being captured securely.</Text></Card></SafeAreaView>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, header: { padding: spacing.lg, paddingBottom: spacing.md }, eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, title: { color: colors.ink, fontSize: typography.title, fontWeight: '800', marginTop: spacing.xs }, subtitle: { color: colors.muted, fontSize: typography.small, lineHeight: 19, marginTop: spacing.xs }, grid: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg }, stat: { flex: 1, padding: spacing.sm }, value: { color: colors.primary, fontSize: 22, fontWeight: '800' }, label: { color: colors.muted, fontSize: 11, marginTop: 4 }, info: { margin: spacing.lg, backgroundColor: colors.primarySoft }, infoTitle: { color: colors.primaryDark, fontSize: typography.h3, fontWeight: '800' }, infoText: { color: colors.primaryDark, fontSize: typography.small, lineHeight: 19, marginTop: spacing.sm } });
