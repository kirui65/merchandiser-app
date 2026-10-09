import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { createFieldRequest, deleteFieldRequest, fetchMyFieldRequests } from '../api/teamLeader';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import PrimaryButton from '../components/PrimaryButton';
import { ErrorState, LoadingState } from '../components/ScreenState';
import { formatDateTime } from '../utils/formatters';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, typography } from '../theme/tokens';

const defaultStart = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();

export default function FieldRequestScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [requests, setRequests] = useState([]);
  const [requestType, setRequestType] = useState('leave');
  const [startsAt, setStartsAt] = useState(defaultStart());
  const [endsAt, setEndsAt] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setRequests(await fetchMyFieldRequests());
    } catch (loadError) {
      setError(loadError.response?.data?.error?.message || 'Your field requests could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    const start = new Date(startsAt);
    const end = endsAt.trim() ? new Date(endsAt) : null;
    if (!Number.isFinite(start.getTime()) || (end && !Number.isFinite(end.getTime()))) {
      setError('Enter valid ISO date/time values, for example 2026-10-08T09:00:00Z.');
      return;
    }
    if (end && end < start) {
      setError('End time must be after the start time.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createFieldRequest({
        requestType,
        startsAt: start.toISOString(),
        ...(end ? { endsAt: end.toISOString() } : {}),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      setReason('');
      setStartsAt(defaultStart());
      setEndsAt('');
      await load(true);
    } catch (submitError) {
      setError(submitError.response?.data?.error?.message || 'Your request could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  }

  function withdraw(request) {
    Alert.alert('Withdraw request?', 'This will remove the pending request from your team’s review list.', [
      { text: 'Keep request', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFieldRequest(request.id);
            setRequests((current) => current.filter((item) => item.id !== request.id));
          } catch (withdrawError) {
            setError(withdrawError.response?.data?.error?.message || 'The request could not be withdrawn.');
          }
        },
      },
    ]);
  }

  if (loading) return <LoadingState colors={colors} label="Loading field requests…" />;
  if (error && !requests.length) return <ErrorState colors={colors} message={error} onRetry={load} />;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        ListHeaderComponent={(
          <View style={styles.header}>
            <Text style={styles.eyebrow}>MY TEAM REQUESTS</Text>
            <Text style={styles.heading}>Request time or field support</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Card style={styles.form}>
              <View style={styles.typeChoices}>
                {['leave', 'field'].map((type) => (
                  <Pressable key={type} onPress={() => setRequestType(type)} style={[styles.typeChoice, requestType === type && styles.typeChoiceSelected]}>
                    <Text style={[styles.typeText, requestType === type && styles.typeTextSelected]}>{type === 'leave' ? 'Leave' : 'Field request'}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>Start time (ISO date/time)</Text>
              <TextInput value={startsAt} onChangeText={setStartsAt} style={styles.input} autoCapitalize="none" />
              <Text style={styles.label}>End time (optional)</Text>
              <TextInput value={endsAt} onChangeText={setEndsAt} style={styles.input} placeholder="2026-10-08T17:00:00Z" placeholderTextColor={colors.muted} autoCapitalize="none" />
              <Text style={styles.label}>Reason (optional)</Text>
              <TextInput value={reason} onChangeText={setReason} style={[styles.input, styles.multiline]} multiline maxLength={1000} placeholder="Add context for your team leader" placeholderTextColor={colors.muted} />
              <PrimaryButton title="Submit request" onPress={submit} loading={submitting} disabled={submitting} />
            </Card>
            <Text style={styles.sectionTitle}>Request history</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Card style={styles.requestCard}>
            <View style={styles.row}><Text style={styles.requestType}>{item.requestType === 'leave' ? 'Leave' : 'Field request'}</Text><Text style={styles.status}>{item.status}</Text></View>
            <Text style={styles.detail}>Starts {formatDateTime(item.startsAt)}</Text>
            {item.endsAt ? <Text style={styles.detail}>Ends {formatDateTime(item.endsAt)}</Text> : null}
            {item.reason ? <Text style={styles.detail}>{item.reason}</Text> : null}
            {item.status === 'pending' ? <Pressable onPress={() => withdraw(item)}><Text style={styles.withdraw}>Withdraw pending request</Text></Pressable> : null}
          </Card>
        )}
        ListEmptyComponent={<EmptyState title="No requests yet" message="Submitted leave and field requests will appear here." />}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.lg, gap: spacing.sm },
  header: { gap: spacing.sm, marginBottom: spacing.md },
  eyebrow: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: 11, letterSpacing: 1.2 },
  heading: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.title },
  error: { color: colors.error, fontFamily: typography.fontFamily, fontSize: typography.small },
  form: { gap: spacing.sm },
  typeChoices: { flexDirection: 'row', gap: spacing.sm },
  typeChoice: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill },
  typeChoiceSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  typeText: { color: colors.muted, fontFamily: typography.fontFamilySemiBold, fontSize: typography.small },
  typeTextSelected: { color: colors.primaryDark },
  label: { color: colors.ink, fontFamily: typography.fontFamilyBold, fontSize: typography.small },
  input: { minHeight: 44, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, color: colors.ink, backgroundColor: colors.surface, fontSize: 12 },
  multiline: { minHeight: 70, paddingTop: spacing.sm, textAlignVertical: 'top' },
  sectionTitle: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h3, marginTop: spacing.sm },
  requestCard: { gap: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  requestType: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.body },
  status: { color: colors.warning, fontFamily: typography.fontFamilyExtraBold, fontSize: 11, textTransform: 'uppercase' },
  detail: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small },
  withdraw: { color: colors.error, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.small, marginTop: spacing.xs },
});
