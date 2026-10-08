import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { fetchLeads } from '../api/leads';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { ErrorState, LoadingState } from '../components/ScreenState';
import { formatDateTime } from '../utils/formatters';
import { useTheme } from '../theme/ThemeContext';
import { spacing, typography } from '../theme/tokens';

function asDate(value) {
  if (value && typeof value.toDate === 'function') return value.toDate();
  if (value && typeof value === 'object') {
    const seconds = value.seconds ?? value._seconds;
    if (Number.isFinite(seconds)) return new Date(seconds * 1000);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function FollowUpsScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const allLeads = await fetchLeads();
      const now = new Date();
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);
      setLeads(allLeads
        .map((lead) => ({ ...lead, followUpDate: asDate(lead.nextFollowUpAt) }))
        .filter((lead) => lead.followUpDate
          && lead.followUpDate <= endOfToday
          && !['closed', 'not_interested'].includes(lead.status))
        .sort((a, b) => a.followUpDate - b.followUpDate));
    } catch (loadError) {
      setError(loadError.response?.data?.error?.message || 'Follow-ups could not be loaded. Check your connection and retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState colors={colors} label="Loading follow-ups…" />;
  if (error && !leads.length) return <ErrorState colors={colors} message={error} onRetry={load} />;

  return (
    <SafeAreaView style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={leads}
        keyExtractor={(lead) => lead.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        ListHeaderComponent={<View style={styles.heading}>
          <Text style={styles.eyebrow}>CALL PLANNER</Text>
          <Text style={styles.title}>Follow-ups</Text>
          <Text style={styles.subtitle}>Overdue and due today, oldest first.</Text>
        </View>}
        renderItem={({ item }) => {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const overdue = item.followUpDate < startOfToday;
          return (
            <Pressable onPress={() => navigation.navigate('LeadDetail', { leadId: item.id })}>
              <Card style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={[styles.due, overdue && styles.overdue]}>{overdue ? 'Overdue' : 'Due today'}</Text>
                </View>
                <Text style={styles.phone}>{item.organization || item.phone}</Text>
                <Text style={styles.date}>{formatDateTime(item.nextFollowUpAt)}</Text>
              </Card>
            </Pressable>
          );
        }}
        ListEmptyComponent={<EmptyState icon="✓" title="No follow-ups due" message="Leads scheduled for today or earlier will appear here." />}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { flexGrow: 1, padding: spacing.lg },
  heading: { gap: spacing.xs, marginBottom: spacing.md },
  eyebrow: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: 11, letterSpacing: 1.2 },
  title: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.title },
  subtitle: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small },
  card: { marginBottom: spacing.sm, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  name: { flex: 1, color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h3 },
  due: { color: colors.warning, fontFamily: typography.fontFamilyExtraBold, fontSize: 11 },
  overdue: { color: colors.error },
  phone: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small },
  date: { color: colors.muted, fontFamily: typography.fontFamilySemiBold, fontSize: 11 },
  error: { color: colors.error, padding: spacing.md },
});
