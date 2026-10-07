import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchTeamOverview } from '../api/teamLeader';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { ErrorState, LoadingState } from '../components/ScreenState';
import { useTheme } from '../theme/ThemeContext';
import { spacing, typography } from '../theme/tokens';

export default function TeamOverviewScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setOverview(await fetchTeamOverview());
    } catch (loadError) {
      setError(loadError.response?.data?.error?.message || 'Team overview could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  if (loading) return <LoadingState colors={colors} label="Loading team overview…" />;
  if (error && !overview) return <ErrorState colors={colors} message={error} onRetry={load} />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      >
        <Text style={styles.eyebrow}>TEAM PERFORMANCE</Text>
        <Text style={styles.heading}>Team overview</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {(overview?.teams || []).map((team) => (
          <Text key={team.id} style={styles.teamName}>{team.name}</Text>
        ))}
        {!overview?.teams?.length ? (
          <EmptyState title="No active team assigned" message="Ask an administrator to assign you as a team leader." />
        ) : (
          <>
            <Text style={styles.memberCount}>{overview.memberCount} active team members</Text>
            <View style={styles.grid}>
              <Card style={styles.metric}><Text style={styles.value}>{overview.sales.count}</Text><Text style={styles.label}>Sales logged</Text><Text style={styles.detail}>KES {Number(overview.sales.total || 0).toLocaleString('en-KE', { maximumFractionDigits: 2 })}</Text></Card>
              <Card style={styles.metric}><Text style={styles.value}>{overview.activations.count}</Text><Text style={styles.label}>Activations</Text><Text style={styles.detail}>{overview.activations.totalFootfall} reached</Text></Card>
              <Card style={styles.metric}><Text style={styles.value}>{overview.leads.count}</Text><Text style={styles.label}>Leads</Text><Text style={styles.detail}>{overview.leads.openCount} active · {overview.leads.calls} calls</Text></Card>
              <Card style={styles.metric}><Text style={styles.value}>{overview.merchandisingAudits.count}</Text><Text style={styles.label}>Outlet checks</Text><Text style={styles.detail}>{overview.merchandisingAudits.lowStockCount} low-stock flags</Text></Card>
            </View>
            <Card>
              <Text style={styles.cardTitle}>Cross-role activity</Text>
              {overview.leaderboard.length ? overview.leaderboard.slice(0, 5).map((member) => (
                <View key={member.repId} style={styles.rankRow}>
                  <Text style={styles.rank}>#{member.rank}</Text>
                  <View style={styles.memberCopy}><Text style={styles.memberName}>{member.name}</Text><Text style={styles.role}>{member.role.replace(/_/g, ' ')}</Text></View>
                  <Text style={styles.activity}>{member.activityCount}</Text>
                </View>
              )) : <Text style={styles.detail}>No activity recorded yet.</Text>}
              <Text style={styles.note}>Activity counts combine each role’s logged field actions.</Text>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  eyebrow: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: 11, letterSpacing: 1.2 },
  heading: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.title },
  teamName: { color: colors.primaryDark, fontFamily: typography.fontFamilyBold, fontSize: typography.h3 },
  memberCount: { color: colors.muted, fontFamily: typography.fontFamilySemiBold, fontSize: typography.small },
  error: { color: colors.error, fontFamily: typography.fontFamilySemiBold, fontSize: typography.small },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: { width: '48%', flexGrow: 1, gap: 4 },
  value: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: 25 },
  label: { color: colors.ink, fontFamily: typography.fontFamilyBold, fontSize: typography.small },
  detail: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: 11 },
  cardTitle: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h3, marginBottom: spacing.sm },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rank: { width: 36, color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h3 },
  memberCopy: { flex: 1 },
  memberName: { color: colors.ink, fontFamily: typography.fontFamilyBold, fontSize: typography.small },
  role: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: 11, textTransform: 'capitalize' },
  activity: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h3 },
  note: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: 10, marginTop: spacing.sm },
});
