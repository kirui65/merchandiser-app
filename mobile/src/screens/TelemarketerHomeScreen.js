import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchCalls, fetchLeads } from '../api/leads';
import Card from '../components/Card';
import { ErrorState, LoadingState } from '../components/ScreenState';
import { formatNumber } from '../utils/formatters';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, typography } from '../theme/tokens';

function asDate(value) {
  if (value && typeof value.toDate === 'function') return value.toDate();
  if (value && typeof value === 'object') {
    const seconds = value.seconds ?? value._seconds;
    if (Number.isFinite(seconds)) return new Date(seconds * 1000);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isDue(value, now) {
  const followUp = asDate(value);
  if (!followUp) return false;
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  return followUp <= endOfToday;
}

export default function TelemarketerHomeScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const [leads, calls] = await Promise.all([fetchLeads(), fetchCalls()]);
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      setStats({
        callsToday: calls.filter((call) => asDate(call.startedAt)?.toISOString().slice(0, 10) === today).length,
        conversions: leads.filter((lead) => lead.status === 'converted'
          && asDate(lead.updatedAt)?.toISOString().slice(0, 10) === today).length,
        followUpsDue: leads.filter((lead) => !['closed', 'not_interested'].includes(lead.status) && isDue(lead.nextFollowUpAt, now)).length,
        totalLeads: leads.length,
      });
    } catch (loadError) {
      setError(loadError.response?.data?.error?.message || 'Telemarketing activity could not be loaded. Check your connection and retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState colors={colors} label="Loading today’s telemarketing activity…" />;
  if (error && !stats) return <ErrorState colors={colors} message={error} onRetry={load} />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      >
        <Text style={styles.eyebrow}>TELEMARKETER</Text>
        <Text style={styles.title}>Welcome, {user?.name || 'there'}</Text>
        <Text style={styles.subtitle}>Your calls and follow-ups at a glance.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.metrics}>
          <Metric label="Calls today" value={stats?.callsToday ?? 0} colors={colors} styles={styles} />
          <Metric label="Conversions" value={stats?.conversions ?? 0} colors={colors} styles={styles} />
          <Metric label="Follow-ups due" value={stats?.followUpsDue ?? 0} colors={colors} styles={styles} />
          <Metric label="Open prospects" value={stats?.totalLeads ?? 0} colors={colors} styles={styles} />
        </View>
        <Pressable accessibilityRole="button" style={styles.action} onPress={() => navigation.getParent()?.navigate('Leads')}>
          <Text style={styles.actionText}>Open leads</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.actionSecondary} onPress={() => navigation.getParent()?.navigate('FollowUps')}>
          <Text style={styles.actionSecondaryText}>Review follow-ups</Text>
        </Pressable>
        <Text style={styles.note}>Call logging retries with the same request ID if the connection drops.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value, colors, styles }) {
  return (
    <Card style={styles.metric}>
      <Text style={styles.metricValue}>{formatNumber(value)}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Card>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  eyebrow: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: 11, letterSpacing: 1.2 },
  title: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.title },
  subtitle: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small },
  error: { color: colors.error, fontFamily: typography.fontFamilySemiBold, fontSize: typography.small },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: { width: '48%', minHeight: 104, justifyContent: 'center' },
  metricValue: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h2 },
  metricLabel: { color: colors.muted, fontFamily: typography.fontFamilySemiBold, fontSize: 11, marginTop: spacing.xs },
  action: { minHeight: 50, justifyContent: 'center', alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.primary },
  actionText: { color: colors.white, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.button },
  actionSecondary: { minHeight: 50, justifyContent: 'center', alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  actionSecondaryText: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.button },
  note: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: 11, textAlign: 'center' },
});
