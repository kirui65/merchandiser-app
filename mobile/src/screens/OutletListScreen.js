import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { fetchOutlets } from '../api/catalog';
import OutletCard from '../components/OutletCard';
import EmptyState from '../components/EmptyState';
import { colors, spacing, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { ErrorState, LoadingState } from '../components/ScreenState';

export default function OutletListScreen({ navigation }) {
  const { colors: activeColors } = useTheme(); const styles = createStyles(activeColors);
  const [outlets, setOutlets] = useState([]); const [error, setError] = useState(null); const [loading, setLoading] = useState(true); const [query, setQuery] = useState(''); const [refreshing, setRefreshing] = useState(false);
  async function load() { setError(null); try { setOutlets(await fetchOutlets()); } catch { setError('Unable to load outlets'); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }
  const filtered = outlets.filter((outlet) => `${outlet.name} ${outlet.address || ''}`.toLowerCase().includes(query.toLowerCase()));
  if (loading) return <LoadingState colors={activeColors} label="Loading outlets…" />; if (error) return <ErrorState colors={activeColors} message={error} onRetry={load} />;
  return <SafeAreaView style={styles.container}><View style={styles.header}><Text style={styles.eyebrow}>YOUR ROUTE</Text><Text style={styles.title}>Assigned outlets</Text><Text style={styles.subtitle}>{outlets.length} locations in your plan</Text><TextInput style={styles.search} placeholder="Search outlets" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} /></View><FlatList data={filtered} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={activeColors.primary} />} renderItem={({ item }) => <OutletCard outlet={item} onPress={() => navigation.navigate('SaleEntry', { outlet: item })} />} ListEmptyComponent={<EmptyState icon="⌖" title="No outlets found" message={query ? 'Try a different search.' : 'No outlets have been assigned to you yet.'} />} /></SafeAreaView>;
}
const createStyles = (colors) => StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, header: { padding: spacing.lg, paddingBottom: spacing.sm }, eyebrow: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, title: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.title, fontWeight: '800', marginTop: spacing.xs }, subtitle: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small, marginTop: spacing.xs }, search: { height: 48, marginTop: spacing.md, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, color: colors.ink }, list: { flexGrow: 1, padding: spacing.lg, paddingTop: spacing.sm }, error: { color: colors.error, paddingHorizontal: spacing.lg } });
