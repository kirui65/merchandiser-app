import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import { fetchOutlets } from '../api/catalog';
import { fetchMySales } from '../api/sales';
import { getRoute } from '../api/routes';
import { getDb, initDb } from '../offline/db';
import { getPendingSales } from '../offline/salesQueue';
import { isRouteTrackingActive, startRouteTracking, stopRouteTracking } from '../location/gpsTracker';
import { formatDateTime, formatKes } from '../utils/formatters';
import { businessDateKey } from '../utils/businessDate';
import { radius, spacing, typography } from '../theme/tokens';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../theme/ThemeContext';

const elapsed = (start) => {
  if (!start) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 60000));
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

export default function HomeScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const network = useNetInfo();
  const styles = createStyles(colors);
  const [stats, setStats] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [shiftStartedAt, setShiftStartedAt] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [queuedSales, setQueuedSales] = useState(0);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      initDb();
      try { setQueuedSales(getPendingSales().length); } catch { setQueuedSales(0); }
      const [routeResult, outletsResult, salesResult] = await Promise.allSettled([
        getRoute(businessDateKey()), fetchOutlets(), fetchMySales(),
      ]);
      const route = routeResult.status === 'fulfilled' ? routeResult.value : null;
      const outletResponse = outletsResult.status === 'fulfilled' ? outletsResult.value : [];
      const outlets = Array.isArray(outletResponse) ? outletResponse.filter(Boolean) : [];
      const salesResponse = salesResult.status === 'fulfilled' ? salesResult.value : [];
      const sales = Array.isArray(salesResponse) ? salesResponse.filter(Boolean) : [];
      const plannedIds = Array.isArray(route?.plannedOutletIds) ? route.plannedOutletIds : [];
      const planned = plannedIds.length ? plannedIds : outlets.filter((item) => typeof item.id === 'string').map((item) => item.id);
      const visitedIds = Array.isArray(route?.visitedOutletIds) ? route.visitedOutletIds : [];
      const visited = visitedIds.filter((id) => planned.includes(id));
      const today = businessDateKey();
      const todaySales = sales.filter((sale) => sale.saleStatus !== 'voided' && businessDateKey(sale.timestamp) === today);
      const latestSale = [...todaySales].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] || null;
      setStats({
        total: planned.length,
        visited: visited.length,
        remaining: Math.max(0, planned.length - visited.length),
        sales: todaySales.length,
        revenue: todaySales.reduce((sum, sale) => sum + Number(sale.total || 0), 0),
        latestSale,
      });
      const failed = [routeResult, outletsResult, salesResult].some((result) => result.status === 'rejected');
      setSyncError(failed ? 'Some activity could not be refreshed. Pull down to retry.' : null);
      if (!failed) setLastUpdatedAt(new Date());
      const stored = getDb().getFirstSync("SELECT value FROM app_settings WHERE key = 'shiftStartedAt';");
      setShiftStartedAt(stored?.value || null);
    } catch (error) {
      setSyncError(error?.message || 'Your dashboard could not be refreshed. Pull down to retry.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    isRouteTrackingActive().then(setTracking).catch(() => setTracking(false));
  }, [load]);

  const open = (tab, screen) => navigation.getParent()?.navigate(tab, { screen });
  const toggleShift = async () => {
    if (!tracking) {
      Alert.alert(t('ready'), t('startShiftPrompt'), [
        { text: 'Cancel', style: 'cancel' },
        { text: t('startShift'), onPress: async () => {
          try {
            await startRouteTracking();
            const started = new Date().toISOString();
            getDb().runSync("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('shiftStartedAt', ?);", [started]);
            setShiftStartedAt(started);
            setTracking(true);
          } catch (error) { setSyncError(error?.message || 'Unable to start your shift.'); }
        } },
      ]);
      return;
    }
    try {
      await stopRouteTracking();
      getDb().runSync("DELETE FROM app_settings WHERE key = 'shiftStartedAt';");
      setShiftStartedAt(null);
      setTracking(false);
    } catch (error) { setSyncError(error?.message || 'Unable to end your shift.'); }
  };

  const progress = stats?.total ? Math.min(100, Math.round((stats.visited / stats.total) * 100)) : 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('goodMorning') : hour < 18 ? 'Good afternoon' : 'Good evening';
  const initial = (user?.name || user?.email || 'U').trim().slice(0, 1).toUpperCase();
  const statusLabel = syncError
    ? t('syncFailed')
    : network.isConnected === false
      ? t('offlineStatus')
      : queuedSales > 0
        ? t('queuedSync', { count: queuedSales })
        : lastUpdatedAt
          ? t('updatedAt', { time: lastUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })
          : 'Refreshing your workspace';
  const statusColor = syncError ? colors.error : network.isConnected === false ? colors.warning : queuedSales ? colors.warning : colors.success;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      >
        <View style={styles.topRow}>
          <View style={styles.greeting}>
            <Text style={styles.date}>{new Date().toLocaleDateString(language === 'sw' ? 'sw-KE' : undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
            <Text style={styles.title}>{greeting}, {user?.name?.trim().split(/\s+/)[0] || 'there'}</Text>
            <View style={styles.statusRow}><View style={[styles.statusDot, { backgroundColor: statusColor }]} /><Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text></View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Open account" style={styles.avatar} onPress={() => open('MoreTab', 'More')}>
            <Text style={styles.avatarText}>{initial}</Text>
          </Pressable>
        </View>

        {syncError ? <Pressable accessibilityRole="button" onPress={() => load(true)} style={styles.errorBanner}><Ionicons name="refresh-circle-outline" size={20} color={colors.error} /><Text style={styles.errorText}>{syncError} Tap to retry.</Text></Pressable> : null}

        <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{t('today')}</Text><Text style={styles.sectionHint}>Your field activity at a glance</Text></View>
        <View style={styles.metrics}>
          <Metric icon="navigate-outline" label={t('outletsVisited')} value={stats ? `${stats.visited}/${stats.total}` : '—'} colors={colors} />
          <Metric icon="receipt-outline" label={t('salesLogged')} value={stats ? String(stats.sales) : '—'} colors={colors} />
          <Metric icon="wallet-outline" label={t('totalToday')} value={stats ? formatKes(stats.revenue) : '—'} colors={colors} />
        </View>

        <Card style={styles.routeCard}>
          <View style={styles.cardTop}><View style={styles.routeIcon}><Ionicons name="map-outline" size={20} color={colors.primary} /></View><View style={styles.routeCopy}><Text style={styles.cardEyebrow}>{t('todayRoute').toUpperCase()}</Text><Text style={styles.routeSummary}>{stats ? `${stats.visited} visited · ${stats.remaining} remaining` : 'Loading your route'}</Text></View><Text style={styles.percent}>{progress}%</Text></View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
          <View style={styles.routeFooter}><Text style={styles.mutedText}>{stats?.total ? `${stats.total} planned outlets` : 'Your route progress appears here'}</Text><Pressable accessibilityRole="button" onPress={() => open('RouteTab', 'RouteMap')}><Text style={styles.link}>{t('routeAction')} <Ionicons name="arrow-forward" size={13} color={colors.primary} /></Text></Pressable></View>
        </Card>

        <Card style={styles.shiftCard}>
          <View style={styles.shiftHeader}><View style={[styles.shiftIcon, tracking && styles.shiftIconActive]}><Ionicons name={tracking ? 'radio-outline' : 'location-outline'} size={20} color={tracking ? colors.success : colors.primary} /></View><View style={styles.shiftCopy}><Text style={styles.shiftTitle}>{tracking ? t('shiftInProgress') : t('ready')}</Text><Text style={styles.mutedText}>{tracking ? `${t('routeActive')} · ${elapsed(shiftStartedAt) || 'just started'}` : t('startTracking')}</Text></View><View style={[styles.shiftPill, tracking && styles.shiftPillActive]}><Text style={[styles.shiftPillText, tracking && styles.shiftPillTextActive]}>{tracking ? 'ACTIVE' : 'READY'}</Text></View></View>
          <PrimaryButton title={tracking ? t('endShift') : t('startShift')} icon={<Ionicons name={tracking ? 'stop-circle-outline' : 'play-circle-outline'} size={19} color={tracking ? colors.primaryDark : colors.white} />} variant={tracking ? 'secondary' : 'primary'} onPress={toggleShift} />
        </Card>

        <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{t('quickActions')}</Text><Text style={styles.sectionHint}>Common tasks</Text></View>
        <View style={styles.actions}>
          <Action title={t('recordSale')} detail="Capture a completed order" icon="add-circle-outline" primary onPress={() => open('OutletsTab', 'Outlets')} colors={colors} />
          <Action title={t('assignedOutlets')} detail="Find a store on your route" icon="storefront-outline" onPress={() => open('OutletsTab', 'Outlets')} colors={colors} />
          <Action title={t('performance')} detail="Review your sales progress" icon="stats-chart-outline" onPress={() => open('MoreTab', 'Performance')} colors={colors} />
          <Action title={t('pendingSales')} detail={queuedSales ? `${queuedSales} waiting to sync` : 'Check sync status'} icon="cloud-upload-outline" onPress={() => open('MoreTab', 'PendingSales')} colors={colors} />
        </View>

        {stats?.latestSale ? <Pressable style={styles.recentSale} onPress={() => open('SalesTab', 'History')}><View style={styles.recentIcon}><Ionicons name="checkmark-done-outline" size={17} color={colors.success} /></View><View style={styles.recentCopy}><Text style={styles.recentTitle}>Latest sale recorded</Text><Text style={styles.mutedText}>{stats.latestSale.outletName || 'Outlet'} · {formatDateTime(stats.latestSale.timestamp)}</Text></View><Text style={styles.recentAmount}>{formatKes(stats.latestSale.total)}</Text></Pressable> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ icon, label, value, colors }) {
  return <Card style={stylesMetric.card}><Ionicons name={icon} size={18} color={colors.primary} /><Text numberOfLines={1} adjustsFontSizeToFit style={[stylesMetric.value, { color: colors.ink }]}>{value}</Text><Text numberOfLines={1} style={[stylesMetric.label, { color: colors.muted }]}>{label}</Text></Card>;
}

function Action({ title, detail, icon, primary, onPress, colors }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [stylesAction.card, { backgroundColor: colors.surface, borderColor: colors.border }, primary && { borderColor: colors.primary, backgroundColor: colors.primarySoft }, pressed && stylesAction.pressed]}>
    <View style={[stylesAction.icon, { backgroundColor: primary ? colors.surface : colors.primarySoft }]}><Ionicons name={icon} size={20} color={colors.primary} /></View>
    <Text style={[stylesAction.title, { color: colors.ink }]}>{title}</Text><Text numberOfLines={2} style={[stylesAction.detail, { color: colors.muted }]}>{detail}</Text>
    <Ionicons style={stylesAction.arrow} name="arrow-forward" size={16} color={colors.primary} />
  </Pressable>;
}

const stylesMetric = StyleSheet.create({
  card: { flex: 1, minWidth: 0, minHeight: 106, justifyContent: 'space-between', padding: spacing.md, borderWidth: 1, borderColor: '#E3E9EF', shadowOpacity: 0.04, elevation: 1 },
  value: { marginTop: spacing.sm, fontFamily: typography.fontFamilyExtraBold, fontSize: 19, fontWeight: '800' },
  label: { fontFamily: typography.fontFamilySemiBold, fontSize: 10, fontWeight: '600' },
});

const stylesAction = StyleSheet.create({
  card: { position: 'relative', width: '48.5%', minHeight: 132, padding: spacing.md, borderWidth: 1, borderRadius: radius.lg, gap: 6 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  icon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  title: { paddingRight: 10, fontFamily: typography.fontFamilyExtraBold, fontSize: 13, fontWeight: '800' },
  detail: { paddingRight: 5, fontFamily: typography.fontFamily, fontSize: 10, lineHeight: 14 },
  arrow: { position: 'absolute', right: 13, top: 17 },
});

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 36, gap: spacing.md },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xs },
  greeting: { flex: 1 }, date: { color: colors.muted, fontFamily: typography.fontFamilySemiBold, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  title: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: 24, fontWeight: '800', marginTop: 3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 }, statusDot: { width: 7, height: 7, borderRadius: 4 }, statusText: { fontFamily: typography.fontFamilySemiBold, fontSize: 10, fontWeight: '700' },
  avatar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.primary }, avatarText: { color: colors.white, fontFamily: typography.fontFamilyExtraBold, fontSize: 17, fontWeight: '800' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.errorSoft }, errorText: { flex: 1, color: colors.error, fontFamily: typography.fontFamilySemiBold, fontSize: 11 },
  sectionHeading: { marginTop: spacing.xs }, sectionTitle: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: 16, fontWeight: '800' }, sectionHint: { marginTop: 2, color: colors.muted, fontFamily: typography.fontFamily, fontSize: 10 },
  metrics: { flexDirection: 'row', gap: spacing.sm },
  routeCard: { padding: spacing.md, borderWidth: 1, borderColor: colors.border, shadowOpacity: 0.05, elevation: 1 }, cardTop: { flexDirection: 'row', alignItems: 'center', gap: 11 }, routeIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.primarySoft }, routeCopy: { flex: 1 }, cardEyebrow: { color: colors.muted, fontFamily: typography.fontFamilyExtraBold, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 }, routeSummary: { marginTop: 3, color: colors.ink, fontFamily: typography.fontFamilyBold, fontSize: 13, fontWeight: '700' }, percent: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: 19, fontWeight: '800' },
  progressTrack: { height: 7, marginTop: spacing.md, overflow: 'hidden', borderRadius: radius.pill, backgroundColor: colors.border }, progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.success }, routeFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 10 }, mutedText: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: 10 }, link: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: 10, fontWeight: '800' },
  shiftCard: { gap: spacing.md, borderWidth: 1, borderColor: colors.border, shadowOpacity: 0.05, elevation: 1 }, shiftHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 }, shiftIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.primarySoft }, shiftIconActive: { backgroundColor: colors.successSoft }, shiftCopy: { flex: 1, gap: 3 }, shiftTitle: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: 14, fontWeight: '800' }, shiftPill: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.primarySoft }, shiftPillActive: { backgroundColor: colors.successSoft }, shiftPillText: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: 8, fontWeight: '800', letterSpacing: 0.6 }, shiftPillTextActive: { color: colors.success },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  recentSale: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface }, recentIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.successSoft }, recentCopy: { flex: 1, gap: 3 }, recentTitle: { color: colors.ink, fontFamily: typography.fontFamilyBold, fontSize: 11, fontWeight: '700' }, recentAmount: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: 12, fontWeight: '800' },
});
