import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchAvailableCampaigns } from '../api/campaigns';
import { initDb } from '../offline/db';
import { cacheCampaigns, getCachedCampaigns } from '../offline/campaignCatalog';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, typography } from '../theme/tokens';

export default function CampaignPicker({ value, onChange, label = 'CAMPAIGN (OPTIONAL)' }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [campaigns, setCampaigns] = useState([]);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let mounted = true;
    initDb();
    if (!user?.id) return () => { mounted = false; };
    fetchAvailableCampaigns().then((items) => {
      cacheCampaigns(user.id, items);
      if (mounted) setCampaigns(items);
    }).catch(() => {
      const cached = getCachedCampaigns(user.id);
      if (mounted) {
        setCampaigns(cached);
        setUnavailable(true);
      }
    });
    return () => { mounted = false; };
  }, [user?.id]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.options}>
        <Pressable onPress={() => onChange(null)} style={[styles.option, !value && styles.selected]}>
          <Text style={[styles.optionText, !value && styles.selectedText]}>Unassigned</Text>
        </Pressable>
        {campaigns.map((campaign) => (
          <Pressable key={campaign.id} onPress={() => onChange(campaign.id)} style={[styles.option, value === campaign.id && styles.selected]}>
            <Text style={[styles.optionText, value === campaign.id && styles.selectedText]}>{campaign.name}</Text>
            <Text style={styles.client}>{campaign.clientName}</Text>
          </Pressable>
        ))}
      </View>
      {unavailable ? <Text style={styles.notice}>Campaign list could not refresh. Showing saved campaigns; records without a selection remain unattributed.</Text> : null}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { gap: spacing.xs },
  label: { color: colors.muted, fontFamily: typography.fontFamilyExtraBold, fontSize: 10, letterSpacing: 1 },
  options: { gap: spacing.xs },
  option: { padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surface },
  selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionText: { color: colors.ink, fontFamily: typography.fontFamilySemiBold, fontSize: typography.small },
  selectedText: { color: colors.primaryDark },
  client: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: 11, marginTop: 2 },
  notice: { color: colors.warning, fontFamily: typography.fontFamily, fontSize: 11 },
});
