import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchCompanyReport } from '../api/reports';
import Card from '../components/Card';
import { ErrorState, LoadingState } from '../components/ScreenState';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { formatKes } from '../utils/formatters';
import { spacing, typography } from '../theme/tokens';

function reportPeriod(todayOnly = false) {
  const now = new Date();
  const from = todayOnly
    ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { from: from.toISOString(), to: now.toISOString() };
}

export default function AdminHomeScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const month = reportPeriod();
      const today = reportPeriod(true);
      const [monthly, daily] = await Promise.all([
        fetchCompanyReport(month.from, month.to),
        fetchCompanyReport(today.from, today.to),
      ]);
      setReports({ monthly, daily });
    } catch (loadError) {
      setError(loadError.response?.data?.error?.message || 'Company overview could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  if (loading) return <LoadingState colors={colors} label="Loading company overview…" />;
  if (error && !reports) return <ErrorState colors={colors} message={error} onRetry={load} />;

  const monthly = reports.monthly;
  const daily = reports.daily;
  const topTeams = monthly.teamPerformance || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      >
        <Text style={styles.eyebrow}>COMPANY WORKSPACE</Text>
        <Text style={styles.title}>Welcome, {user?.name || 'Admin'}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.sectionTitle}>This month</Text>
        <View style={styles.grid}>
          <MetricCard label="Sales" value={monthly.sales.count} detail={formatKes(monthly.sales.total)} styles={styles} />
          <MetricCard label="Activations" value={monthly.activations.count} detail={`${monthly.activations.footfallCount} people reached`} styles={styles} />
          <MetricCard label="Leads" value={monthly.leads.count} detail={`${monthly.leads.byStatus.converted || 0} converted`} styles={styles} />
          <MetricCard label="Outlet checks" value={monthly.merchandisingAudits.count} detail={`${monthly.merchandisingAudits.lowStockChecks} low-stock flags`} styles={styles} />
        </View>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Today’s activity</Text>
          <View style={styles.dailyRow}><Text style={styles.dailyLabel}>Sales</Text><Text style={styles.dailyValue}>{daily.sales.count} · {formatKes(daily.sales.total)}</Text></View>
          <View style={styles.dailyRow}><Text style={styles.dailyLabel}>Activations</Text><Text style={styles.dailyValue}>{daily.activations.count} · {daily.activations.footfallCount} reached</Text></View>
          <View style={styles.dailyRow}><Text style={styles.dailyLabel}>Leads</Text><Text style={styles.dailyValue}>{daily.leads.count}</Text></View>
          <View style={styles.dailyRow}><Text style={styles.dailyLabel}>Outlet checks</Text><Text style={styles.dailyValue}>{daily.merchandisingAudits.count}</Text></View>
        </Card>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Top teams this month</Text>
          {topTeams.length ? topTeams.slice(0, 5).map((team, index) => (
            <View key={team.teamId} style={styles.teamRow}>
              <Text style={styles.rank}>#{index + 1}</Text>
              <View style={styles.teamCopy}><Text style={styles.teamName}>{team.teamName}</Text><Text style={styles.teamDetail}>{team.activations} activations · {team.leads} leads · {team.merchandisingAudits} outlet checks</Text></View>
              <Text style={styles.teamSales}>{formatKes(team.sales.total)}</Text>
            </View>
          )) : <Text style={styles.empty}>No team activity recorded this month.</Text>}
          <Text style={styles.note}>Read-only mobile summary. Use the manager dashboard for campaign, regional, and account management.</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ label, value, detail, styles }) {
  return (
    <Card style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricDetail}>{detail}</Text>
    </Card>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  eyebrow: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: 11, letterSpacing: 1.2 },
  title: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.title },
  sectionTitle: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h3 },
  error: { color: colors.error, fontFamily: typography.fontFamily, fontSize: typography.small },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: { width: '48%', flexGrow: 1, gap: 3 },
  metricValue: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: 25 },
  metricLabel: { color: colors.ink, fontFamily: typography.fontFamilyBold, fontSize: typography.small },
  metricDetail: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: 11 },
  card: { gap: spacing.sm },
  cardTitle: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h3, marginBottom: spacing.xs },
  dailyRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  dailyLabel: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small },
  dailyValue: { color: colors.ink, fontFamily: typography.fontFamilyBold, fontSize: typography.small },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rank: { width: 30, color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.body },
  teamCopy: { flex: 1 },
  teamName: { color: colors.ink, fontFamily: typography.fontFamilyBold, fontSize: typography.small },
  teamDetail: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: 10, marginTop: 3 },
  teamSales: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.small },
  empty: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small },
  note: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: 10, marginTop: spacing.sm },
});
