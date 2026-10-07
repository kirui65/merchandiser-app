import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, SafeAreaView, Text, View, StyleSheet } from 'react-native';
import { fetchActivations } from '../api/activations';
import { getActiveActivation, getLocalActivations } from '../offline/activationsQueue';
import { initDb } from '../offline/db';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import PrimaryButton from '../components/PrimaryButton';
import { ErrorState, LoadingState } from '../components/ScreenState';
import { useTheme } from '../theme/ThemeContext';
import { spacing, typography } from '../theme/tokens';
import { formatDateTime } from '../utils/formatters';

export default function ActivationListScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [activations, setActivations] = useState([]);
  const [activeDraft, setActiveDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (refresh = false) => {
    initDb();
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    setActiveDraft(getActiveActivation());
    const local = getLocalActivations();
    try {
      const remote = await fetchActivations();
      const merged = new Map(remote.map((item) => [item.id, item]));
      for (const item of local) {
        if (item.localSyncStatus !== 'synced' || !merged.has(item.id)) {
          merged.set(item.id, { ...merged.get(item.id), ...item });
        }
      }
      setActivations([...merged.values()].sort((a, b) => dateValue(b.startedAt) - dateValue(a.startedAt)));
    } catch {
      setActivations(local);
      setError('Could not load activation history. Saved drafts remain available offline.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => load(true));
    load();
    return unsubscribe;
  }, [load, navigation]);

  if (loading) return <LoadingState colors={colors} label="Loading activations…" />;
  if (error && activations.length === 0 && !activeDraft) {
    return <ErrorState colors={colors} message={error} onRetry={load} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.heading}>
        <Text style={styles.title}>Field activity</Text>
        <Text style={styles.subtitle}>Record activations and evidence, even when you’re offline.</Text>
        <View style={styles.button}>
          <PrimaryButton
            title={activeDraft ? 'Resume activation' : 'Start activation'}
            onPress={() => navigation.navigate('ActivationEntry')}
          />
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={activations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View>
            <Card style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.activity}>{label(item.activityType)}</Text>
                <Text style={styles.status}>{label(item.status)}</Text>
              </View>
              <Text style={styles.meta}>{formatTimestamp(item.startedAt)} · {item.footfallCount || 0} reached</Text>
            </Card>
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="◉" title="No activations yet" message="Start a field activation to capture engagement, samples, feedback, and expenses." />}
      />
    </SafeAreaView>
  );
}

function label(value = '') {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dateValue(value) {
  const seconds = value?.seconds ?? value?._seconds;
  const date = new Date(typeof seconds === 'number' ? seconds * 1000 : value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatTimestamp(value) {
  const seconds = value?.seconds ?? value?._seconds;
  const date = new Date(typeof seconds === 'number' ? seconds * 1000 : value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : formatDateTime(date);
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  heading: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.title },
  subtitle: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small, marginTop: spacing.xs },
  button: { marginTop: spacing.md },
  error: { marginHorizontal: spacing.lg, color: colors.error, fontSize: typography.small },
  list: { flexGrow: 1, padding: spacing.lg, paddingTop: spacing.sm },
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  activity: { flex: 1, color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h3 },
  status: { color: colors.primary, fontFamily: typography.fontFamilyBold, fontSize: 12, textTransform: 'capitalize' },
  meta: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small, marginTop: spacing.xs },
});
