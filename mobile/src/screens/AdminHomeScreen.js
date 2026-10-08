import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import Card from '../components/Card';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { spacing, typography } from '../theme/tokens';

export default function AdminHomeScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>COMPANY WORKSPACE</Text>
        <Text style={styles.title}>Welcome, {user?.name || 'Admin'}</Text>
        <Card>
          <Text style={styles.cardTitle}>Company overview</Text>
          <Text style={styles.copy}>Company-wide activity and team performance will appear here.</Text>
          <Text style={styles.note}>Use the manager dashboard for campaigns, reports, and account administration.</Text>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg, gap: spacing.md },
  eyebrow: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: 11, letterSpacing: 1.2 },
  title: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.title },
  cardTitle: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h3, marginBottom: spacing.sm },
  copy: { color: colors.ink, fontFamily: typography.fontFamily, fontSize: typography.body },
  note: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small, marginTop: spacing.sm },
});
