import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { fetchFieldRequests, reviewFieldRequest } from '../api/teamLeader';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { ErrorState, LoadingState } from '../components/ScreenState';
import PrimaryButton from '../components/PrimaryButton';
import { formatDateTime } from '../utils/formatters';
import { useTheme } from '../theme/ThemeContext';
import { spacing, typography } from '../theme/tokens';

export default function FieldRequestApprovalsScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setRequests(await fetchFieldRequests());
    } catch (loadError) {
      setError(loadError.response?.data?.error?.message || 'Field requests could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function review(request, status) {
    setReviewingId(request.id);
    setError(null);
    try {
      const updated = await reviewFieldRequest(request.id, status);
      setRequests((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (reviewError) {
      setError(reviewError.response?.data?.error?.message || `Unable to ${status} this request.`);
    } finally {
      setReviewingId(null);
    }
  }

  if (loading) return <LoadingState colors={colors} label="Loading field requests…" />;
  if (error && !requests.length) return <ErrorState colors={colors} message={error} onRetry={load} />;

  const pendingCount = requests.filter((request) => request.status === 'pending').length;
  return (
    <SafeAreaView style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={requests}
        keyExtractor={(request) => request.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        ListHeaderComponent={<View style={styles.header}><Text style={styles.eyebrow}>TEAM OVERSIGHT</Text><Text style={styles.heading}>Field requests</Text><Text style={styles.subtitle}>{pendingCount} pending approval{pendingCount === 1 ? '' : 's'}</Text></View>}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.topRow}>
              <Text style={styles.type}>{item.requestType === 'leave' ? 'Leave request' : 'Field request'}</Text>
              <Text style={[styles.status, item.status !== 'pending' && styles.reviewed]}>{item.status}</Text>
            </View>
            <Text style={styles.detail}>Requested by {item.requesterName || item.requesterId}</Text>
            <Text style={styles.detail}>Starts {formatDateTime(item.startsAt)}</Text>
            {item.endsAt ? <Text style={styles.detail}>Ends {formatDateTime(item.endsAt)}</Text> : null}
            {item.reason ? <Text style={styles.reason}>{item.reason}</Text> : null}
            {item.status === 'pending' ? (
              <View style={styles.actions}>
                <View style={styles.action}><PrimaryButton title="Reject" variant="secondary" onPress={() => review(item, 'rejected')} disabled={reviewingId === item.id} loading={reviewingId === item.id} /></View>
                <View style={styles.action}><PrimaryButton title="Approve" onPress={() => review(item, 'approved')} disabled={reviewingId === item.id} loading={reviewingId === item.id} /></View>
              </View>
            ) : item.reviewedAt ? <Text style={styles.detail}>Reviewed {formatDateTime(item.reviewedAt)}</Text> : null}
          </Card>
        )}
        ListEmptyComponent={<EmptyState title="No field requests" message="Leave and field requests from your team will appear here." />}
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
  error: { color: colors.error, padding: spacing.md },
  card: { gap: spacing.xs },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  type: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h3 },
  status: { color: colors.warning, fontFamily: typography.fontFamilyExtraBold, fontSize: 10, textTransform: 'uppercase' },
  reviewed: { color: colors.muted },
  detail: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small },
  reason: { color: colors.ink, fontFamily: typography.fontFamily, fontSize: typography.small, marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  action: { flex: 1 },
});
