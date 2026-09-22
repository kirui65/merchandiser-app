import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { isRouteTrackingActive, startRouteTracking, stopRouteTracking } from '../location/gpsTracker';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import SyncStatusBadge from '../components/SyncStatusBadge';
import { colors, radius, spacing, typography } from '../theme/tokens';
import { fetchMyTargetProgress } from '../api/targets';
import { useLanguage } from '../i18n/LanguageContext';

export default function HomeScreen({ navigation }) {
  const { language, setLanguage, t } = useLanguage();
  const [tracking, setTracking] = useState(false); const [updatingShift, setUpdatingShift] = useState(false); const [shiftError, setShiftError] = useState(null); const [targetProgress, setTargetProgress] = useState(null);
  useEffect(() => { isRouteTrackingActive().then(setTracking).catch(() => {}); }, []);
  useEffect(() => { fetchMyTargetProgress().then(setTargetProgress).catch(() => {}); }, []);
  async function toggleTracking() { setUpdatingShift(true); setShiftError(null); try { if (tracking) { await stopRouteTracking(); setTracking(false); } else { await startRouteTracking(); setTracking(true); } } catch (error) { setShiftError(error.message || 'Unable to update shift tracking.'); } finally { setUpdatingShift(false); } }
  const targetPercent = targetProgress?.target ? Math.min(100, Math.round((targetProgress.current / targetProgress.target) * 100)) : 0;
  const quickActions = [
    { title: t('performance'), icon: 'trending-up', target: 'Performance' },
    { title: t('assignedOutlets'), icon: 'storefront-outline', target: 'Outlets' },
    { title: t('salesHistory'), icon: 'time-outline', target: 'History' },
    { title: t('shiftHistory'), icon: 'trail-sign-outline', target: 'ShiftHistory' },
    { title: t('pendingSales'), icon: 'cloud-upload-outline', target: 'PendingSales' },
    { title: t('todaysRoute'), icon: 'map-outline', target: 'RouteMap' },
  ];
  return <SafeAreaView style={styles.container}><ScrollView contentContainerStyle={styles.content}><View style={styles.languageRow}><Text style={styles.eyebrow}>{t('fieldOperations')}</Text><Pressable onPress={() => setLanguage(language === 'en' ? 'sw' : 'en')} style={styles.languageButton}><Text style={styles.languageText}>{language === 'en' ? 'SW' : 'EN'}</Text></Pressable></View><Text style={styles.title}>{t('goodMorning')}</Text><Text style={styles.subtitle}>{t('homeIntro')}</Text><Card style={styles.syncCard}><View style={styles.cardHeading}><Ionicons name="checkmark-circle" size={typography.h3} color={colors.success} /><Text style={styles.cardLabel}>{t('syncStatus')}</Text></View><SyncStatusBadge status="synced" label={t('synced')} /></Card>{targetProgress && <Card style={styles.targetCard}><View style={styles.cardHeading}><Ionicons name="flag-outline" size={typography.h3} color={colors.primary} /><Text style={styles.sectionTitle}>{t('monthlyTarget')}</Text></View><Text style={styles.targetValue}>KES {targetProgress.current.toLocaleString()} / KES {targetProgress.target.toLocaleString()}</Text><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${targetPercent}%` }]} /></View><Text style={styles.statLabel}>{targetProgress.target ? `${targetPercent}% of ${targetProgress.month} target` : t('noTarget', { month: targetProgress.month })}</Text></Card>}<Card style={styles.glanceCard}><Text style={styles.sectionTitle}>{t('today')}</Text><View style={styles.stats}><View style={styles.stat}><Ionicons name="location-outline" size={typography.body} color={colors.primary} /><Text style={styles.statValue}>0 / 0</Text><Text style={styles.statLabel}>{t('outletsVisited')}</Text></View><View style={styles.stat}><Ionicons name="receipt-outline" size={typography.body} color={colors.primary} /><Text style={styles.statValue}>0</Text><Text style={styles.statLabel}>{t('salesLogged')}</Text></View><View style={styles.stat}><Ionicons name="cash-outline" size={typography.body} color={colors.primary} /><Text style={styles.statValue}>KES 0</Text><Text style={styles.statLabel}>{t('totalToday')}</Text></View></View></Card><Card style={[styles.shiftCard, tracking && styles.activeShiftCard]}><View style={styles.shiftHeading}><View style={styles.shiftIcon}><Ionicons name={tracking ? 'pause' : 'play'} size={typography.h3} color={tracking ? colors.error : colors.white} /></View><View style={styles.shiftCopy}><Text style={styles.sectionTitle}>{tracking ? t('shiftInProgress') : t('readyForShift')}</Text><Text style={styles.status}>{tracking ? t('routeActive') : t('startTracking')}</Text></View></View>{shiftError ? <Text style={styles.shiftError}>{shiftError}</Text> : null}<PrimaryButton title={tracking ? t('endShift') : t('startShift')} icon={<Ionicons name={tracking ? 'stop' : 'play'} size={typography.small} color={colors.white} />} loading={updatingShift} onPress={toggleTracking} variant={tracking ? 'danger' : 'primary'} /></Card><Text style={styles.sectionTitle}>{t('quickAccess')}</Text><View style={styles.actions}>{quickActions.map((action) => <Pressable key={action.target} style={({ pressed }) => [styles.actionPressable, pressed && styles.actionPressed]} onPress={() => navigation.navigate(action.target)}><Card style={styles.actionCard}><View style={styles.actionIcon}><Ionicons name={action.icon} size={typography.h3} color={colors.primary} /></View><Text style={styles.actionLabel}>{action.title}</Text></Card></Pressable>)}</View></ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  languageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  languageButton: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  languageText: { color: colors.primaryDark, fontSize: typography.small, fontWeight: '800' },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: typography.title, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: typography.body, lineHeight: 22, marginTop: -spacing.sm },
  syncCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, backgroundColor: colors.successSoft, shadowOpacity: 0, elevation: 0 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cardLabel: { color: colors.ink, fontSize: typography.h3, fontWeight: '800' },
  targetCard: { borderLeftWidth: 4, borderLeftColor: colors.primary },
  sectionTitle: { color: colors.ink, fontSize: typography.h3, fontWeight: '800', marginBottom: spacing.md },
  glanceCard: { paddingBottom: spacing.lg },
  stats: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xs },
  statValue: { color: colors.primary, fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 11, marginTop: 1, textAlign: 'center' },
  targetValue: { color: colors.primary, fontSize: 20, fontWeight: '800' },
  progressTrack: { height: spacing.xs, marginTop: spacing.md, backgroundColor: colors.border, borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.pill },
  shiftCard: { gap: spacing.md, padding: spacing.lg, borderTopWidth: 4, borderTopColor: colors.primary, shadowColor: colors.primaryDark, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 6 },
  activeShiftCard: { borderTopColor: colors.error, shadowColor: colors.error },
  shiftHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  shiftIcon: { width: spacing.xl, height: spacing.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.pill },
  shiftCopy: { flex: 1 },
  status: { color: colors.muted, fontSize: typography.small, marginTop: -spacing.sm },
  shiftError: { color: colors.error, fontSize: typography.small, lineHeight: 19 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm },
  actionPressable: { width: '48.5%' },
  actionPressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  actionCard: { minHeight: spacing.xl * 3, alignItems: 'center', justifyContent: 'center', padding: spacing.md, shadowOpacity: 0.05, elevation: 2 },
  actionIcon: { width: spacing.xl, height: spacing.xl, marginBottom: spacing.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.pill },
  actionLabel: { color: colors.ink, fontSize: typography.small, fontWeight: '800', textAlign: 'center' },
});
