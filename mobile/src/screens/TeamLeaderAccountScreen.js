import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, typography } from '../theme/tokens';

export default function TeamLeaderAccountScreen() {
  const { user, signOut } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.name}>{user?.name || 'Team leader'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.role}>Team leader</Text>
        <Pressable accessibilityRole="button" onPress={signOut} style={styles.signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  name: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h2 },
  email: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.body },
  role: { color: colors.primary, fontFamily: typography.fontFamilyBold, fontSize: typography.small, textTransform: 'uppercase' },
  signOut: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.errorSoft, marginTop: spacing.lg },
  signOutText: { color: colors.error, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.button },
});
