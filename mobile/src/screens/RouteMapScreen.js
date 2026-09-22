import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker, Polyline } from 'react-native-maps';
import { getRoute } from '../api/routes';
import { fetchOutlets } from '../api/catalog';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { colors, spacing, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

const FALLBACK_REGION = { latitude: -1.286389, longitude: 36.817223, latitudeDelta: 0.08, longitudeDelta: 0.08 };
const coordinateForOutlet = (outlet) => { const point = outlet.location; const latitude = point?.lat ?? point?._latitude; const longitude = point?.lng ?? point?._longitude; return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null; };

export default function RouteMapScreen() {
  const { colors: activeColors } = useTheme(); const styles = createStyles(activeColors);
  const [route, setRoute] = useState(null); const [outlets, setOutlets] = useState([]); const [error, setError] = useState(null);
  useEffect(() => { Promise.all([getRoute(new Date().toISOString().slice(0, 10)), fetchOutlets()]).then(([loadedRoute, loadedOutlets]) => { setRoute(loadedRoute); setOutlets(loadedRoute.plannedOutletIds?.length ? loadedOutlets.filter((outlet) => loadedRoute.plannedOutletIds.includes(outlet.id)) : loadedOutlets); }).catch(() => setError('Unable to load today’s route. Please try again.')); }, []);
  const routePoints = useMemo(() => route?.pings?.map((ping) => ({ latitude: ping.lat, longitude: ping.lng })).filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)) || [], [route]);
  const pins = useMemo(() => outlets.map((outlet) => ({ outlet, coordinate: coordinateForOutlet(outlet) })).filter(({ coordinate }) => coordinate), [outlets]);
  const region = routePoints[0] ? { ...routePoints[0], latitudeDelta: 0.025, longitudeDelta: 0.025 } : pins[0] ? { ...pins[0].coordinate, latitudeDelta: 0.025, longitudeDelta: 0.025 } : FALLBACK_REGION;
  if (error) return <EmptyState title="Route unavailable" message={error} />;
  if (!route) return <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.loadingText}>Loading route…</Text></View>;
  const missed = route.plannedOutletIds?.filter((id) => !route.visitedOutletIds?.includes(id)).length || 0;
  return <SafeAreaView style={styles.container}><View style={styles.header}><Text style={styles.eyebrow}>SHIFT SUMMARY</Text><Text style={styles.title}>Today’s route</Text><Text style={styles.subtitle}>Your GPS trail and planned outlet coverage.</Text></View><View style={styles.grid}><Card style={styles.stat}><Text style={styles.value}>{route.pings?.length || 0}</Text><Text style={styles.label}>GPS pings</Text></Card><Card style={styles.stat}><Text style={styles.value}>{route.visitedOutletIds?.length || 0}</Text><Text style={styles.label}>Visited</Text></Card><Card style={styles.stat}><Text style={styles.value}>{missed}</Text><Text style={styles.label}>Missed</Text></Card></View><View style={styles.mapShell}><MapView style={styles.map} initialRegion={region}>{routePoints.length > 1 ? <Polyline coordinates={routePoints} strokeColor={colors.primary} strokeWidth={4} /> : null}{routePoints.length ? <Marker coordinate={routePoints.at(-1)} pinColor={colors.primaryDark}><Callout><Text>Latest GPS ping</Text></Callout></Marker> : null}{pins.map(({ outlet, coordinate }) => { const visited = route.visitedOutletIds?.includes(outlet.id); return <Marker key={outlet.id} coordinate={coordinate} pinColor={visited ? colors.success : colors.warning}><Callout><View><Text style={styles.calloutTitle}>{outlet.name}</Text><Text>{visited ? 'Visited' : 'Not visited'}</Text></View></Callout></Marker>; })}</MapView></View>{!routePoints.length && !pins.length ? <EmptyState icon="⌖" title="No route points yet" message="Start your shift to record GPS pings and add planned outlets to see them here." /> : null}</SafeAreaView>;
}
const createStyles = (colors) => StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, gap: spacing.sm }, loadingText: { color: colors.muted, fontSize: typography.small }, header: { padding: spacing.lg, paddingBottom: spacing.md }, eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, title: { color: colors.ink, fontSize: typography.title, fontWeight: '800', marginTop: spacing.xs }, subtitle: { color: colors.muted, fontSize: typography.small, lineHeight: 19, marginTop: spacing.xs }, grid: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }, stat: { flex: 1, padding: spacing.sm }, value: { color: colors.primary, fontSize: 22, fontWeight: '800' }, label: { color: colors.muted, fontSize: 11, marginTop: 4 }, mapShell: { flex: 1, overflow: 'hidden', margin: spacing.lg, marginTop: 0, borderRadius: 18 }, map: { flex: 1 }, calloutTitle: { fontWeight: '700' } });
