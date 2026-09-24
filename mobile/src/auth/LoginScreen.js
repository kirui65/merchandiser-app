import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from './AuthContext';
import { radius, spacing, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const errorAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(errorAnimation, {
      toValue: error ? 1 : 0,
      useNativeDriver: true,
      tension: 90,
      friction: 10,
    }).start();
  }, [error, errorAnimation]);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(
        err?.response?.data?.error?.message
          || (err?.response ? 'Login failed. Check your credentials.' : 'Cannot reach the server. It may be waking up; wait a minute and try again.')
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Image source={require('../../assets/brandsphere-wordmark.jpg')} style={styles.brandLogo} resizeMode="contain" accessibilityLabel="Brandsphere Marketing Agency" />
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to start your shift</Text>

        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputShell, focusedField === 'email' && styles.inputShellFocused]}>
              <Text style={styles.inputIcon}>✉</Text>
              <TextInput
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="you@company.com"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputShell, focusedField === 'password' && styles.inputShellFocused]}>
              <Text style={styles.inputIcon}>●</Text>
              <TextInput
                style={styles.input}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter your password"
                placeholderTextColor={colors.muted}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                hitSlop={10}
                onPress={() => setShowPassword((visible) => !visible)}
                style={styles.visibilityButton}
              >
                <Text style={styles.visibilityIcon}>{showPassword ? '◉' : '◌'}</Text>
              </Pressable>
            </View>
          </View>

          {error ? (
            <Animated.View
              style={[styles.errorBanner, {
                opacity: errorAnimation,
                transform: [{ translateY: errorAnimation.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
              }]}
            >
              <Text style={styles.errorIcon}>!</Text>
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: submitting, busy: submitting }}
            disabled={submitting}
            onPress={handleSubmit}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            {submitting ? <View style={styles.spinner} /> : <Text style={styles.buttonText}>SIGN IN</Text>}
          </Pressable>
        </View>
        <Text style={styles.footer}>Secure access for your field team</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  brandLogo: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 330,
    height: 116,
    marginBottom: spacing.md,
  },
  title: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.title, fontWeight: '800', letterSpacing: 0.2, textAlign: 'center' },
  subtitle: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: 15, marginTop: spacing.xs, marginBottom: spacing.xl, textAlign: 'center' },
  card: {
    width: '100%',
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  fieldGroup: { marginBottom: spacing.md },
  label: { color: colors.ink, fontFamily: typography.fontFamilyBold, fontSize: typography.small, fontWeight: '700', marginBottom: spacing.xs },
  inputShell: { flexDirection: 'row', alignItems: 'center', minHeight: 54, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  inputShellFocused: { borderColor: colors.primary, backgroundColor: colors.white },
  inputIcon: { width: 24, color: colors.primary, fontFamily: typography.fontFamily, fontSize: 18, textAlign: 'left' },
  input: { flex: 1, color: colors.ink, fontFamily: typography.fontFamily, fontSize: typography.body, paddingVertical: 0 },
  visibilityButton: { alignItems: 'center', justifyContent: 'center', width: 28, marginLeft: spacing.sm },
  visibilityIcon: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: 20 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.errorSoft },
  errorIcon: { width: 22, height: 22, marginRight: spacing.sm, borderRadius: 11, backgroundColor: colors.error, color: colors.white, fontFamily: typography.fontFamilyExtraBold, fontSize: 14, fontWeight: '800', lineHeight: 22, textAlign: 'center' },
  errorText: { flex: 1, color: colors.error, fontFamily: typography.fontFamily, fontSize: typography.small, lineHeight: 18 },
  button: { alignItems: 'center', justifyContent: 'center', minHeight: 52, borderRadius: radius.md, backgroundColor: colors.primary, shadowColor: colors.primaryDark, shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  buttonPressed: { backgroundColor: colors.primaryDark, transform: [{ scale: 0.99 }] },
  buttonText: { color: colors.white, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.button, fontWeight: '800', letterSpacing: 1 },
  spinner: { width: 20, height: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.45)', borderTopColor: colors.white, borderRadius: 10 },
  footer: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: 12, marginTop: spacing.lg, textAlign: 'center' },
});
