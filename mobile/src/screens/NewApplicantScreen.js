import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getRecruitmentCampaigns, submitReferral } from '../api/referrals';
import { useTheme } from '../theme/ThemeContext';

const educationOptions = [
  ['KCPE', 'KCPE'], ['KCSE', 'KCSE'], ['certificate', 'Certificate'],
  ['diploma', 'Diploma'], ['degree', 'Degree'], ['postgraduate', 'Postgraduate'], ['other', 'Other higher'],
];
const selectOptions = {
  passportStatus: [['has_passport', 'Has passport'], ['will_get_self_funded', 'Will get one'], ['not_ready', 'Not ready']],
  nitaFeeStatus: [['not_paid', 'Not paid'], ['paid', 'Paid']],
};
const initialForm = { campaignId: '', applicantName: '', applicantIdNumber: '', phone: '', email: '', county: '', education: 'KCPE', passportStatus: 'has_passport', nitaFeeStatus: 'not_paid' };

export default function NewApplicantScreen({ navigation }) {
  const { colors } = useTheme();
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [consent, setConsent] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoadingCampaigns(true);
    getRecruitmentCampaigns()
      .then((result) => {
        if (!active) return;
        setCampaigns(result);
        setForm((current) => ({ ...current, campaignId: current.campaignId || result[0]?.id || '' }));
        if (!result.length) setError('No active recruitment campaign is assigned to your team. Ask your manager to assign your team to the campaign.');
        else setError('');
      })
      .catch(() => active && setError('Could not load campaigns. Check your connection and try again.'))
      .finally(() => active && setLoadingCampaigns(false));
    return () => { active = false; };
  }, []));

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  function field(key, label, props = {}) {
    return <View style={styles.field} key={key}>
      <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
      <TextInput
        value={form[key]}
        onChangeText={(value) => update(key, props.digitsOnly ? value.replace(/\D/g, '') : value)}
        placeholder={label}
        placeholderTextColor={colors.muted}
        keyboardType={props.keyboardType || 'default'}
        autoCapitalize={props.autoCapitalize || 'words'}
        autoComplete={props.autoComplete}
        maxLength={props.maxLength}
        style={[styles.input, { color: colors.ink, borderColor: colors.border, backgroundColor: colors.surface }]}
      />
      {props.hint ? <Text style={[styles.hint, { color: colors.muted }]}>{props.hint}</Text> : null}
    </View>;
  }

  function choices(key, label, options) {
    return <View style={styles.field} key={key}>
      <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
      <View style={styles.choices}>{options.map(([value, title]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: form[key] === value }} onPress={() => update(key, value)} style={[styles.choice, form[key] === value && styles.chosen]}>
        <Text style={[styles.choiceText, form[key] === value && styles.chosenText]}>{title}</Text>
      </Pressable>)}</View>
    </View>;
  }

  async function save() {
    setError('');
    if (!campaigns.length || !form.campaignId) { setError('No active recruitment campaign is assigned to your team. Ask your manager to assign your team to the campaign.'); return; }
    if (form.applicantName.trim().length < 2 || !/^\d{7,10}$/.test(form.applicantIdNumber) || !form.phone.trim() || !form.county.trim() || !form.email.trim() || !consent) {
      setError('Enter the applicant’s full name, 7–10 digit ID number, phone, email, county, and education, then confirm consent.');
      return;
    }
    setSaving(true);
    try {
      await submitReferral({
        ...form,
        applicantName: form.applicantName.trim(),
        applicantIdNumber: form.applicantIdNumber,
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        county: form.county.trim(),
        eligibleForWomenOnlyIntake: true,
        applicantConsent: true,
      });
      Alert.alert('Applicant registered', 'The registration is now linked to your account.');
      navigation.goBack();
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Registration failed. Your entries are still on this screen; check the details and retry.');
    } finally {
      setSaving(false);
    }
  }

  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Text style={[styles.title, { color: colors.ink }]}>Register applicant</Text>
        <Text style={[styles.note, { color: colors.muted }]}>Confirm the applicant agrees before entering their personal information. Their phone number prevents repeat registrations.</Text>
        {loadingCampaigns ? <View style={styles.loading}><ActivityIndicator color={colors.primary}/><Text style={[styles.hint, { color: colors.muted }]}>Loading your team’s campaigns…</Text></View> : null}
        {campaigns.length > 1 ? <View style={styles.field}><Text style={[styles.label, { color: colors.ink }]}>Campaign</Text><View style={styles.choices}>{campaigns.map((campaign) => <Pressable key={campaign.id} onPress={() => update('campaignId', campaign.id)} style={[styles.choice, form.campaignId === campaign.id && styles.chosen]}><Text style={[styles.choiceText, form.campaignId === campaign.id && styles.chosenText]}>{campaign.name}</Text></Pressable>)}</View></View> : campaigns.length === 1 ? <Text style={[styles.campaign, { color: colors.primary }]}>{campaigns[0].name}</Text> : null}
        {field('applicantName', 'Full name', { autoComplete: 'name', maxLength: 160 })}
        {field('applicantIdNumber', 'National ID number', { keyboardType: 'number-pad', autoCapitalize: 'none', digitsOnly: true, maxLength: 10, hint: 'Enter the digits only.' })}
        {field('phone', 'Phone number', { keyboardType: 'phone-pad', autoComplete: 'tel', autoCapitalize: 'none', maxLength: 24 })}
        {field('email', 'Email address', { keyboardType: 'email-address', autoComplete: 'email', autoCapitalize: 'none', maxLength: 254 })}
        {field('county', 'County', { autoCapitalize: 'words', maxLength: 100 })}
        {choices('education', 'Highest education completed', educationOptions)}
        {choices('passportStatus', 'Passport readiness', selectOptions.passportStatus)}
        {choices('nitaFeeStatus', 'NITA fee status', selectOptions.nitaFeeStatus)}
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: consent }} onPress={() => setConsent((value) => !value)} style={styles.consent}>
          <View style={[styles.checkbox, consent && styles.checked]}><Text style={styles.check}>{consent ? '✓' : ''}</Text></View>
          <Text style={[styles.note, { color: colors.ink, flex: 1 }]}>The applicant confirms she is an adult woman and consents to sharing her ID, contact, education, and campaign details for recruitment.</Text>
        </Pressable>
        {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
        <Pressable accessibilityRole="button" disabled={saving || loadingCampaigns} onPress={save} style={[styles.button, (saving || loadingCampaigns) && styles.disabled]}>
          {saving ? <ActivityIndicator color="#172033"/> : <Text style={styles.buttonText}>Submit registration</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, content: { padding: 20, paddingBottom: 42 }, title: { fontSize: 24, fontWeight: '900' },
  note: { fontSize: 13, lineHeight: 19, marginTop: 7, marginBottom: 12 }, field: { marginTop: 13 },
  label: { fontWeight: '800', marginBottom: 7 }, input: { borderWidth: 1, borderRadius: 12, padding: 13, fontSize: 15 },
  hint: { fontSize: 12, marginTop: 5 }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choice: { borderColor: '#D8E0EA', borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 10 },
  chosen: { backgroundColor: '#2337FF', borderColor: '#2337FF' }, choiceText: { fontSize: 12, fontWeight: '700', color: '#536174' },
  chosenText: { color: 'white' }, campaign: { marginTop: 12, fontSize: 13, fontWeight: '800' }, loading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  consent: { flexDirection: 'row', gap: 10, alignItems: 'center', marginVertical: 19 }, checkbox: { width: 23, height: 23, borderWidth: 1, borderColor: '#AAB2C0', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: '#2337FF', borderColor: '#2337FF' }, check: { color: 'white', fontWeight: '900' }, error: { marginBottom: 12, lineHeight: 18 },
  button: { backgroundColor: '#CBF532', borderRadius: 14, alignItems: 'center', justifyContent: 'center', minHeight: 50, padding: 15 },
  buttonText: { fontWeight: '900', color: '#172033' }, disabled: { opacity: 0.55 },
});
