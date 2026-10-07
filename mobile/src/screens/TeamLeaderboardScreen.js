import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { fetchTeamOverview } from '../api/teamLeader';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { ErrorState, LoadingState } from '../components/ScreenState';
import { useTheme } from '../theme/ThemeContext';
import { spacing, typography } from '../theme/tokens';

export default function TeamLeaderboardScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const overview = await fetchTeamOverview();
      setMembers(overview.leaderboard || []);
    } catch (loadError) {
      setError(loadError.response?.data?.error?.message || 'Team leaderboard could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  if (loading) return <LoadingState colors={colors} label="Loading leaderboard…" />;
  if (error && !members.length) return <ErrorState colors={colors} message={error} onRetry={load} />;

  return (
    <SafeAreaView style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={members}
        keyExtractor={(member) => member.repId}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        ListHeaderComponent={<View style={styles.header}><Text style={styles.eyebrow}>TEAM STANDING</Text><Text style={styles.heading}>Leaderboard</Text><Text style={styles.subtitle}>Ranked by combined logged activity across role workflows.</Text></View>}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Text style={styles.rank}>#{item.rank}</Text>
            <View style={styles.copy}><Text style={styles.name}>{item.name}</Text><Text style={styles.role}>{item.role.replace(/_/g, ' ')}</Text></View>
            <Text style={styles.count}>{item.activityCount}</Text>
          </Card>
        )}
        ListEmptyComponent={<EmptyState title="No team members yet" message="Team activity rankings will appear after members are assigned." />}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.lg, gap: spacing.sm },
  header: { gap: spacing.xs, marginBottom: spacing.md },
  eyebrow: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: 11, letterSpacing: 1.2 },
  heading: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.title },
  subtitle: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rank: { width: 44, color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h2 },
  copy: { flex: 1 },
  name: { color: colors.ink, fontFamily: typography.fontFamilyBold, fontSize: typography.body },
  role: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small, textTransform: 'capitalize' },
  count: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h2 },
  error: { color: colors.error, padding: spacing.md },
});
