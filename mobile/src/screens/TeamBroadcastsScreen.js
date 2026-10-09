import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { createBroadcast, fetchBroadcasts, fetchTeamOverview, updateBroadcast } from '../api/teamLeader';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { ErrorState, LoadingState } from '../components/ScreenState';
import PrimaryButton from '../components/PrimaryButton';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, typography } from '../theme/tokens';

export default function TeamBroadcastsScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [teams, setTeams] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [teamId, setTeamId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const overview = await fetchTeamOverview();
      const nextTeams = overview.teams || [];
      setTeams(nextTeams);
      setTeamId((current) => nextTeams.some((team) => team.id === current) ? current : nextTeams[0]?.id || '');
      const items = await fetchBroadcasts();
      setBroadcasts(items || []);
    } catch (loadError) {
      setError(loadError.response?.data?.error?.message || 'Broadcasts could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit(status) {
    if (!teamId || !title.trim() || !message.trim()) {
      setError('Select a team and enter both a title and message.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const broadcast = await createBroadcast({ teamId, title: title.trim(), message: message.trim() });
      if (status === 'published') await updateBroadcast(broadcast.id, { status: 'published' });
      setTitle('');
      setMessage('');
      await load(true);
    } catch (submitError) {
      setError(submitError.response?.data?.error?.message || 'The broadcast could not be saved.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState colors={colors} label="Loading broadcasts…" />;
  if (error && !teams.length) return <ErrorState colors={colors} message={error} onRetry={load} />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>TEAM COMMUNICATION</Text>
        <Text style={styles.heading}>Broadcasts</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {teams.length ? (
          <Card style={styles.form}>
            <Text style={styles.cardTitle}>Compose an announcement</Text>
            {teams.length > 1 ? (
              <View style={styles.teamChoices}>
                {teams.map((team) => (
                  <Text key={team.id} onPress={() => setTeamId(team.id)} style={[styles.teamChoice, team.id === teamId && styles.teamChoiceSelected]}>
                    {team.name}
                  </Text>
                ))}
              </View>
            ) : <Text style={styles.subtitle}>{teams[0].name}</Text>}
            <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Announcement title" placeholderTextColor={colors.muted} maxLength={120} />
            <TextInput value={message} onChangeText={setMessage} style={[styles.input, styles.multiline]} placeholder="Write a message for your team" placeholderTextColor={colors.muted} multiline maxLength={4000} />
            <View style={styles.actions}>
              <View style={styles.action}><PrimaryButton title="Save draft" variant="secondary" onPress={() => submit('draft')} loading={submitting} disabled={submitting} /></View>
              <View style={styles.action}><PrimaryButton title="Publish" onPress={() => submit('published')} loading={submitting} disabled={submitting} /></View>
            </View>
          </Card>
        ) : <EmptyState title="No active team" message="An administrator must assign a team before you can send announcements." />}
        <Text style={styles.sectionTitle}>Recent announcements</Text>
        {broadcasts.length ? broadcasts.map((broadcast) => (
          <Card key={broadcast.id} style={styles.broadcastCard}>
            <View style={styles.broadcastHeader}><Text style={styles.broadcastTitle}>{broadcast.title}</Text><Text style={styles.status}>{broadcast.status}</Text></View>
            <Text style={styles.message}>{broadcast.message}</Text>
          </Card>
        )) : <EmptyState title="No broadcasts yet" message="Drafts and published team announcements will appear here." />}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  eyebrow: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: 11, letterSpacing: 1.2 },
  heading: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.title },
  subtitle: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small },
  error: { color: colors.error, fontFamily: typography.fontFamilySemiBold, fontSize: typography.small },
  form: { gap: spacing.sm },
  cardTitle: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h3 },
  teamChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  teamChoice: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, color: colors.muted, overflow: 'hidden' },
  teamChoiceSelected: { color: colors.primaryDark, backgroundColor: colors.primarySoft, borderColor: colors.primary },
  input: { minHeight: 46, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, color: colors.ink, backgroundColor: colors.surface },
  multiline: { minHeight: 110, paddingTop: spacing.md, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
  sectionTitle: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h3 },
  broadcastCard: { gap: spacing.sm },
  broadcastHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  broadcastTitle: { flex: 1, color: colors.ink, fontFamily: typography.fontFamilyBold, fontSize: typography.body },
  status: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: 10, textTransform: 'uppercase' },
  message: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small, lineHeight: 20 },
});
