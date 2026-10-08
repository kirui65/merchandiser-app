import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { fetchBroadcasts } from '../api/teamLeader';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { ErrorState, LoadingState } from '../components/ScreenState';
import { formatDateTime } from '../utils/formatters';
import { useTheme } from '../theme/ThemeContext';
import { spacing, typography } from '../theme/tokens';

export default function BroadcastFeedScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setBroadcasts(await fetchBroadcasts() || []);
    } catch (loadError) {
      setError(loadError.response?.data?.error?.message || 'Team announcements could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  if (loading) return <LoadingState colors={colors} label="Loading announcements…" />;
  if (error && !broadcasts.length) return <ErrorState colors={colors} message={error} onRetry={load} />;

  return (
    <SafeAreaView style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={broadcasts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        ListHeaderComponent={<View style={styles.header}><Text style={styles.eyebrow}>TEAM COMMUNICATION</Text><Text style={styles.title}>Announcements</Text><Text style={styles.subtitle}>Published messages for your active team.</Text></View>}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Text style={styles.titleText}>{item.title}</Text>
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.date}>{formatDateTime(item.publishedAt || item.createdAt)}</Text>
          </Card>
        )}
        ListEmptyComponent={<EmptyState title="No announcements yet" message="Published team messages will appear here." />}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.lg, gap: spacing.sm },
  header: { gap: spacing.xs, marginBottom: spacing.md },
  eyebrow: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: 11, letterSpacing: 1.2 },
  title: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.title },
  subtitle: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small },
  card: { gap: spacing.sm },
  titleText: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h3 },
  message: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.body, lineHeight: 22 },
  date: { color: colors.primary, fontFamily: typography.fontFamilySemiBold, fontSize: 11 },
  error: { color: colors.error, padding: spacing.md, fontFamily: typography.fontFamily },
});
