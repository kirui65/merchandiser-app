import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { fetchOutlets } from '../api/catalog';
import OutletCard from '../components/OutletCard';
import EmptyState from '../components/EmptyState';
import { colors, spacing, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { ErrorState, LoadingState } from '../components/ScreenState';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../auth/AuthContext';
import { getRoute } from '../api/routes';
import { businessDateKey } from '../utils/businessDate';

export default function OutletListScreen({ navigation }) {
  const { colors: activeColors } = useTheme(); const styles = createStyles(activeColors);
  const { user } = useAuth();
  const [outlets, setOutlets] = useState([]); const [visitedIds, setVisitedIds] = useState([]); const [error, setError] = useState(null); const [loading, setLoading] = useState(true); const [query, setQuery] = useState(''); const [filter, setFilter] = useState('all'); const [refreshing, setRefreshing] = useState(false);
  async function load() { setError(null); const [outletResult, routeResult] = await Promise.allSettled([fetchOutlets(), getRoute(businessDateKey())]); try { if (outletResult.status === 'rejected') throw outletResult.reason; setOutlets(Array.isArray(outletResult.value) ? outletResult.value.filter(Boolean) : []); setVisitedIds(Array.isArray(routeResult.value?.visitedOutletIds) ? routeResult.value.visitedOutletIds : []); } catch { setError('Unable to load outlets'); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }
  const visitedCount = outlets.filter((outlet) => visitedIds.includes(outlet.id)).length;
  const remainingCount = Math.max(0, outlets.length - visitedCount);
  const filtered = outlets.filter((outlet) => `${outlet.name || ''} ${outlet.address || ''} ${outlet.county || ''}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'all' || !visitedIds.includes(outlet.id)));
  if (loading) return <LoadingState colors={activeColors} label="Loading outlets…" />; if (error) return <ErrorState colors={activeColors} message={error} onRetry={load} />;
  return <SafeAreaView style={styles.container}><View style={styles.header}><Text style={styles.eyebrow}>YOUR ROUTE</Text><Text style={styles.title}>Assigned outlets</Text><Text style={styles.subtitle}>{outlets.length} locations · {remainingCount} still to visit</Text>{user?.role === 'rep' ? <View style={styles.newOutlet}><PrimaryButton title="Onboard a new outlet" variant="secondary" onPress={() => navigation.navigate('NewOutlet')} /></View> : null}<TextInput accessibilityLabel="Search assigned outlets" returnKeyType="search" style={styles.search} placeholder="Search by outlet or county" placeholderTextColor={activeColors.muted} value={query} onChangeText={setQuery} /><View style={styles.filters}><FilterChip label={`All (${outlets.length})`} active={filter === 'all'} onPress={() => setFilter('all')} colors={activeColors} /><FilterChip label={`Still to visit (${remainingCount})`} active={filter === 'remaining'} onPress={() => setFilter('remaining')} colors={activeColors} /></View></View><FlatList data={filtered} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={activeColors.primary} />} renderItem={({ item }) => <OutletCard outlet={item} onPress={() => navigation.navigate('SaleEntry', { outlet: item })} onAudit={user?.role === 'rep' ? () => navigation.navigate('OutletAudit', { outlet: item }) : undefined} onCompetitorPrice={user?.role === 'rep' ? () => navigation.navigate('CompetitorPrice', { outlet: item }) : undefined} />} ListEmptyComponent={<EmptyState icon="⌖" title="No outlets found" message={query || filter === 'remaining' ? 'No outlets match this view. Try another search or show all outlets.' : 'No outlets have been assigned to you yet.'} />} /></SafeAreaView>;
}
function FilterChip({ label, active, onPress, colors }) { return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[stylesChip.base, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primarySoft : colors.surface }]}><Text style={[stylesChip.text, { color: active ? colors.primary : colors.muted }]}>{label}</Text></Pressable>; }
const stylesChip = StyleSheet.create({ base: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderRadius: 999 }, text: { fontSize: 11, fontWeight: '800' } });
const createStyles = (colors) => StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, header: { padding: spacing.lg, paddingBottom: spacing.sm }, eyebrow: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, title: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.title, fontWeight: '800', marginTop: spacing.xs }, subtitle: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small, marginTop: spacing.xs }, newOutlet: { marginTop: spacing.md }, search: { height: 48, marginTop: spacing.md, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, color: colors.ink }, filters: { flexDirection: 'row', gap: 8, marginTop: spacing.sm }, list: { flexGrow: 1, padding: spacing.lg, paddingTop: spacing.sm }, error: { color: colors.error, paddingHorizontal: spacing.lg } });
