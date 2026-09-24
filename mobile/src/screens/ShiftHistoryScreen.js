import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { getRouteHistory } from '../api/routes';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { colors, spacing, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { formatDate, formatNumber, formatTime } from '../utils/formatters';

const EARTH_RADIUS_METERS = 6371000;
const radians = (value) => (value * Math.PI) / 180;

function distanceKm(pings = []) {
  return pings.slice(1).reduce((total, point, index) => {
    const previous = pings[index];
    const latitudeDelta = radians(point.lat - previous.lat);
    const longitudeDelta = radians(point.lng - previous.lng);
    const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(previous.lat)) * Math.cos(radians(point.lat)) * Math.sin(longitudeDelta / 2) ** 2;
    return total + (2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }, 0) / 1000;
}

function shiftSummary(route) {
  const pings = route.pings || [];
  const start = pings[0]?.timestamp;
  const end = pings.at(-1)?.timestamp;
  const durationMinutes = start && end ? Math.max(0, Math.round((new Date(end) - new Date(start)) / 60000)) : 0;
  return { start, end, durationMinutes, distance: distanceKm(pings) };
}

function formatDuration(minutes) {
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

export default function ShiftHistoryScreen() {
  const { colors: activeColors } = useTheme(); const styles = createStyles(activeColors);
  const [routes, setRoutes] = useState(null);
  const [error, setError] = useState(null); const [refreshing, setRefreshing] = useState(false);
  async function load(refresh = false) { if (refresh) setRefreshing(true); setError(null); try { setRoutes(await getRouteHistory()); } catch { setError('Unable to load shift history.'); } finally { setRefreshing(false); } }
  useEffect(() => { load(); }, []);
  if (error) return <EmptyState icon="!" title="Shift history unavailable" message={error} />;
  if (!routes) return <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.loadingText}>Loading shifts…</Text></View>;
  return <SafeAreaView style={styles.container}><View style={styles.header}><Text style={styles.eyebrow}>PAST SHIFTS</Text><Text style={styles.title}>Shift history</Text><Text style={styles.subtitle}>Distance and outlet coverage from your recorded routes.</Text></View><FlatList data={routes} keyExtractor={(route) => route.id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={activeColors.primary} />} renderItem={({ item }) => { const summary = shiftSummary(item); return <Card style={styles.card}><Text style={styles.date}>{formatDate(item.date)}</Text>{summary.start ? <Text style={styles.time}>{formatTime(summary.start)} – {formatTime(summary.end)}</Text> : <Text style={styles.time}>No GPS pings recorded</Text>}<View style={styles.stats}><View><Text style={styles.value}>{formatDuration(summary.durationMinutes)}</Text><Text style={styles.label}>Duration</Text></View><View><Text style={styles.value}>{formatNumber(summary.distance, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km</Text><Text style={styles.label}>Distance</Text></View><View><Text style={styles.value}>{formatNumber(item.visitedOutletIds?.length || 0)}</Text><Text style={styles.label}>Visited</Text></View></View></Card>; }} ListEmptyComponent={<EmptyState icon="◷" title="No past shifts" message="Completed shifts with GPS activity will appear here." />} /></SafeAreaView>;
}

const createStyles = (colors) => StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, gap: spacing.sm }, loadingText: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small }, header: { padding: spacing.lg, paddingBottom: spacing.sm }, eyebrow: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, title: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.title, fontWeight: '800', marginTop: spacing.xs }, subtitle: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small, lineHeight: 19, marginTop: spacing.xs }, list: { flexGrow: 1, padding: spacing.lg, paddingTop: spacing.sm }, card: { marginBottom: spacing.md }, date: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h3, fontWeight: '800' }, time: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small, marginTop: 4 }, stats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md }, value: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.body, fontWeight: '800' }, label: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: 11, marginTop: 3 } });
