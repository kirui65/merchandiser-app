import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { fetchCalls } from '../api/leads';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { ErrorState, LoadingState } from '../components/ScreenState';
import { formatDateTime } from '../utils/formatters';
import { useTheme } from '../theme/ThemeContext';
import { spacing, typography } from '../theme/tokens';

export default function CallHistoryScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  async function load(refresh = false) {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setCalls(await fetchCalls());
    } catch {
      setError('Call history could not be loaded. Check your connection and retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);
  if (loading) return <LoadingState colors={colors} label="Loading call history…" />;
  if (error && !calls.length) return <ErrorState colors={colors} message={error} onRetry={load} />;

  return (
    <SafeAreaView style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={calls}
        keyExtractor={(call) => call.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.outcome}>{item.outcome.replace(/_/g, ' ')}</Text>
              <Text style={styles.date}>{formatDateTime(item.startedAt)}</Text>
            </View>
            <Text style={styles.leadId}>Lead: {item.leadId}</Text>
            {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
          </Card>
        )}
        ListEmptyComponent={<EmptyState icon="◷" title="No calls yet" message="Your logged calls will appear here." />}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { flexGrow: 1, padding: spacing.lg },
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  outcome: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h3, textTransform: 'capitalize' },
  date: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: 11 },
  leadId: { color: colors.muted, fontFamily: typography.fontFamilySemiBold, fontSize: 12, marginTop: spacing.sm },
  notes: { color: colors.ink, fontFamily: typography.fontFamily, fontSize: typography.small, marginTop: spacing.xs },
  error: { color: colors.error, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});
