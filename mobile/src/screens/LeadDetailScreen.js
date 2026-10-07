import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { fetchCalls, fetchLead, logCall, updateLead } from '../api/leads';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import PrimaryButton from '../components/PrimaryButton';
import { ErrorState, LoadingState } from '../components/ScreenState';
import { formatDateTime } from '../utils/formatters';
import { createLocalId } from '../utils/ids';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, typography } from '../theme/tokens';

const statuses = ['new', 'contacted', 'qualified', 'converted', 'not_interested', 'closed'];
const scores = ['hot', 'warm', 'cold', 'unscored'];
const outcomes = ['answered', 'no_answer', 'busy', 'voicemail', 'callback_requested', 'wrong_number'];

export default function LeadDetailScreen({ route }) {
  const { leadId } = route.params;
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [lead, setLead] = useState(null);
  const [calls, setCalls] = useState([]);
  const [status, setStatus] = useState('new');
  const [score, setScore] = useState('unscored');
  const [notes, setNotes] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [outcome, setOutcome] = useState('answered');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logging, setLogging] = useState(false);
  const [retryPending, setRetryPending] = useState(false);
  const [error, setError] = useState(null);
  const callAttempt = useRef(null);

  async function load(refresh = false) {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const [nextLead, nextCalls] = await Promise.all([fetchLead(leadId), fetchCalls({ leadId })]);
      setLead(nextLead);
      setCalls(nextCalls);
      setStatus(nextLead.status);
      setScore(nextLead.score);
      setNotes(nextLead.notes || '');
      const followUp = nextLead.nextFollowUpAt ? asDate(nextLead.nextFollowUpAt) : null;
      setFollowUpDate(followUp && !Number.isNaN(followUp.getTime()) ? followUp.toISOString().slice(0, 10) : '');
    } catch {
      setError('Lead details could not be loaded. Check your connection and retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [leadId]);

  async function saveLead() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateLead(leadId, { status, score, notes });
      setLead(updated);
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Changes could not be saved. Please retry.');
    } finally {
      setSaving(false);
    }
  }

  async function submitCall() {
    if (!callAttempt.current) {
      let followUpAt;
      if (followUpDate) {
        const parsed = /^\d{4}-\d{2}-\d{2}$/.test(followUpDate) ? new Date(`${followUpDate}T09:00:00.000Z`) : new Date(NaN);
        if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== followUpDate) {
          setError('Enter a valid follow-up date as YYYY-MM-DD.');
          return;
        }
        followUpAt = parsed.toISOString();
      }
      const now = new Date().toISOString();
      callAttempt.current = {
        id: createLocalId(),
        payload: {
          startedAt: now,
          endedAt: now,
          outcome,
          ...(callNotes.trim() ? { notes: callNotes.trim() } : {}),
          followUpAt: followUpAt ?? null,
          statusAfterCall: status,
          scoreAfterCall: score,
        },
      };
    }

    setLogging(true);
    setError(null);
    setRetryPending(true);
    try {
      await logCall(leadId, callAttempt.current.payload, callAttempt.current.id);
      callAttempt.current = null;
      setRetryPending(false);
      setCallNotes('');
      await load(true);
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Call could not be logged. Your form is still here so you can retry.');
    } finally {
      setLogging(false);
    }
  }

  if (loading) return <LoadingState colors={colors} label="Loading lead…" />;
  if (error && !lead) return <ErrorState colors={colors} message={error} onRetry={load} />;
  if (!lead) return null;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={calls}
        keyExtractor={(call) => call.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        ListHeaderComponent={<>
          <Card style={styles.card}>
            <Text style={styles.name}>{lead.name}</Text>
            <Text style={styles.meta}>{lead.organization || 'No organization recorded'} · {lead.phone}</Text>
            {lead.email ? <Text style={styles.meta}>{lead.email}</Text> : null}
            <Text style={styles.stats}>
              {lead.callCount || 0} calls{lead.lastCalledAt ? ` · Last called ${safeDateTime(lead.lastCalledAt)}` : ''}
            </Text>
          </Card>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Lead status</Text>
            <Text style={styles.label}>STATUS</Text>
            <ChipGroup values={statuses} selected={status} onSelect={setStatus} colors={colors} styles={styles} />
            <Text style={styles.label}>SCORE</Text>
            <ChipGroup values={scores} selected={score} onSelect={setScore} colors={colors} styles={styles} />
            <Text style={styles.label}>NOTES</Text>
            <TextInput multiline value={notes} onChangeText={setNotes} style={[styles.input, styles.multiline]} placeholder="Add notes about this prospect" placeholderTextColor={colors.muted} />
            <PrimaryButton title="Save lead changes" onPress={saveLead} loading={saving} />
          </Card>
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Log a call</Text>
            <Text style={styles.label}>OUTCOME</Text>
            <ChipGroup values={outcomes} selected={outcome} onSelect={setOutcome} disabled={retryPending} colors={colors} styles={styles} />
            <Text style={styles.label}>CALL NOTES</Text>
            <TextInput editable={!retryPending} multiline value={callNotes} onChangeText={setCallNotes} style={[styles.input, styles.multiline]} placeholder="What happened on the call?" placeholderTextColor={colors.muted} />
            <Text style={styles.label}>FOLLOW-UP DATE (OPTIONAL)</Text>
            <TextInput editable={!retryPending} value={followUpDate} onChangeText={setFollowUpDate} style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} />
            {retryPending && !logging ? <Text style={styles.followUp}>Retrying uses the same call entry to avoid duplicates.</Text> : null}
            <PrimaryButton title={retryPending ? 'Retry call' : 'Save call'} onPress={submitCall} loading={logging} />
          </Card>
          <Text style={styles.historyTitle}>Call history</Text>
        </>}
        renderItem={({ item }) => (
          <Card style={styles.callCard}>
            <View style={styles.callHeading}>
              <Text style={styles.callOutcome}>{item.outcome.replace(/_/g, ' ')}</Text>
              <Text style={styles.date}>{safeDateTime(item.startedAt)}</Text>
            </View>
            {item.notes ? <Text style={styles.meta}>{item.notes}</Text> : null}
            {item.followUpAt ? <Text style={styles.followUp}>Follow up: {safeDateTime(item.followUpAt)}</Text> : null}
          </Card>
        )}
        ListEmptyComponent={<EmptyState icon="◷" title="No calls logged" message="Calls you log for this lead will appear here." />}
      />
    </SafeAreaView>
  );
}

function asDate(value) {
  if (value && typeof value === 'object') {
    const seconds = value.seconds ?? value._seconds;
    if (typeof seconds === 'number') return new Date(seconds * 1000);
  }
  return new Date(value);
}

function safeDateTime(value) {
  const date = asDate(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : formatDateTime(date);
}

function ChipGroup({ values, selected, onSelect, disabled = false, colors, styles }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {values.map((value) => (
        <Pressable key={value} disabled={disabled} onPress={() => onSelect(value)} style={[styles.chip, selected === value && { backgroundColor: colors.primary, borderColor: colors.primary }, disabled && { opacity: 0.6 }]}>
          <Text style={[styles.chipText, selected === value && { color: colors.white }]}>{value.replace(/_/g, ' ')}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  card: { marginBottom: spacing.md, gap: spacing.sm },
  name: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h2 },
  meta: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small, lineHeight: 20 },
  stats: { color: colors.primary, fontFamily: typography.fontFamilySemiBold, fontSize: 12, marginTop: spacing.xs },
  error: { color: colors.error, fontFamily: typography.fontFamilySemiBold, marginBottom: spacing.md },
  sectionTitle: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h3, marginBottom: spacing.xs },
  label: { color: colors.muted, fontFamily: typography.fontFamilyExtraBold, fontSize: 10, letterSpacing: 1, marginTop: spacing.xs },
  chips: { gap: spacing.xs, paddingVertical: spacing.xs },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, backgroundColor: colors.surface },
  chipText: { color: colors.ink, fontFamily: typography.fontFamilySemiBold, fontSize: 11, textTransform: 'capitalize' },
  input: { minHeight: 46, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, color: colors.ink, backgroundColor: colors.surface },
  multiline: { minHeight: 80, paddingTop: spacing.sm, textAlignVertical: 'top' },
  historyTitle: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h3, marginVertical: spacing.sm },
  callCard: { marginBottom: spacing.sm, gap: spacing.xs },
  callHeading: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  callOutcome: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.small, textTransform: 'capitalize' },
  date: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: 11 },
  followUp: { color: colors.warning, fontFamily: typography.fontFamilySemiBold, fontSize: 12 },
});
