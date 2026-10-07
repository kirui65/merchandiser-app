import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { createLead, fetchLeads } from '../api/leads';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import PrimaryButton from '../components/PrimaryButton';
import { ErrorState, LoadingState } from '../components/ScreenState';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, typography } from '../theme/tokens';

const statuses = ['all', 'new', 'contacted', 'qualified', 'converted', 'not_interested', 'closed'];
const scores = ['all', 'hot', 'warm', 'cold', 'unscored'];

export default function LeadListScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [leads, setLeads] = useState([]);
  const [status, setStatus] = useState('all');
  const [score, setScore] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', organization: '', phone: '', email: '', source: '' });
  const [saving, setSaving] = useState(false);

  async function load(refresh = false) {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setLeads(await fetchLeads({ status, score }));
    } catch {
      setError('Your leads could not be loaded. Check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [status, score]);

  async function submitLead() {
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Name and phone are required to create a lead.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createLead({
        name: form.name.trim(),
        phone: form.phone.trim(),
        ...(form.organization.trim() ? { organization: form.organization.trim() } : {}),
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
        ...(form.source.trim() ? { source: form.source.trim() } : {}),
      });
      setForm({ name: '', organization: '', phone: '', email: '', source: '' });
      setShowCreate(false);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Lead could not be saved. Check your connection and retry.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState colors={colors} label="Loading leads…" />;
  if (error && !leads.length && !showCreate) return <ErrorState colors={colors} message={error} onRetry={load} />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.heading}>
        <Text style={styles.title}>Prospects</Text>
        <Text style={styles.subtitle}>Track follow-ups and conversation outcomes.</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Card style={styles.filters}>
        <Text style={styles.filterLabel}>STATUS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {statuses.map((value) => <FilterChip key={value} label={label(value)} selected={status === value} onPress={() => setStatus(value)} colors={colors} styles={styles} />)}
        </ScrollView>
        <Text style={styles.filterLabel}>SCORE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {scores.map((value) => <FilterChip key={value} label={label(value)} selected={score === value} onPress={() => setScore(value)} colors={colors} styles={styles} />)}
        </ScrollView>
      </Card>
      <View style={styles.actions}>
        <PrimaryButton title={showCreate ? 'Cancel' : 'Add lead'} variant="secondary" onPress={() => { setShowCreate((value) => !value); setError(null); }} />
      </View>
      {showCreate && <Card style={styles.createCard}>
        <Text style={styles.cardTitle}>New lead</Text>
        <LeadInput label="Name *" value={form.name} onChangeText={(name) => setForm({ ...form, name })} colors={colors} styles={styles} />
        <LeadInput label="Phone *" value={form.phone} onChangeText={(phone) => setForm({ ...form, phone })} keyboardType="phone-pad" colors={colors} styles={styles} />
        <LeadInput label="Organization" value={form.organization} onChangeText={(organization) => setForm({ ...form, organization })} colors={colors} styles={styles} />
        <LeadInput label="Email" value={form.email} onChangeText={(email) => setForm({ ...form, email })} keyboardType="email-address" colors={colors} styles={styles} />
        <LeadInput label="Source" value={form.source} onChangeText={(source) => setForm({ ...form, source })} colors={colors} styles={styles} />
        <PrimaryButton title="Save lead" onPress={submitLead} loading={saving} />
      </Card>}
      <FlatList
        data={leads}
        keyExtractor={(lead) => lead.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate('LeadDetail', { leadId: item.id })}>
            <Card style={styles.leadCard}>
              <View style={styles.leadHeading}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.score}>{label(item.score)}</Text>
              </View>
              <Text style={styles.meta}>{item.organization || item.phone}</Text>
              <View style={styles.leadFooter}>
                <Text style={styles.status}>{label(item.status)}</Text>
                <Text style={styles.meta}>{item.callCount || 0} calls</Text>
              </View>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={<EmptyState icon="◎" title="No leads in this view" message="Add a lead or change the filters to see your prospects." />}
      />
    </SafeAreaView>
  );
}

function label(value) {
  return value === 'all' ? 'All' : value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function FilterChip({ label: text, selected, onPress, colors, styles }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
      <Text style={[styles.chipText, selected && { color: colors.white }]}>{text}</Text>
    </Pressable>
  );
}

function LeadInput({ label: title, value, onChangeText, keyboardType = 'default', colors, styles }) {
  return (
    <View style={styles.field}>
      <Text style={styles.inputLabel}>{title}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        style={styles.input}
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  heading: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.title, fontWeight: '800' },
  subtitle: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small, marginTop: spacing.xs },
  error: { color: colors.error, marginHorizontal: spacing.lg, marginBottom: spacing.sm, fontSize: typography.small },
  filters: { marginHorizontal: spacing.lg, marginVertical: spacing.sm, padding: spacing.md, gap: spacing.xs },
  filterLabel: { color: colors.muted, fontFamily: typography.fontFamilyExtraBold, fontSize: 10, letterSpacing: 1, marginTop: spacing.xs },
  chips: { gap: spacing.xs, paddingVertical: spacing.xs },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: 7, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, backgroundColor: colors.surface },
  chipText: { color: colors.ink, fontFamily: typography.fontFamilySemiBold, fontSize: 11, textTransform: 'capitalize' },
  actions: { alignItems: 'flex-end', paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  createCard: { marginHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  cardTitle: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h3, marginBottom: spacing.xs },
  field: { gap: 5, marginBottom: spacing.xs },
  inputLabel: { color: colors.ink, fontFamily: typography.fontFamilySemiBold, fontSize: 12 },
  input: { minHeight: 46, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, color: colors.ink, backgroundColor: colors.surface },
  list: { flexGrow: 1, padding: spacing.lg, paddingTop: spacing.sm },
  leadCard: { marginBottom: spacing.md },
  leadHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  name: { flex: 1, color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h3 },
  score: { color: colors.primary, fontFamily: typography.fontFamilyBold, fontSize: 12, textTransform: 'capitalize' },
  meta: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small, marginTop: spacing.xs },
  leadFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  status: { color: colors.success, fontFamily: typography.fontFamilyBold, fontSize: 12, textTransform: 'capitalize' },
});
