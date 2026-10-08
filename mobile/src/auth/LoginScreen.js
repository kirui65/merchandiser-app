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
import { rememberSelectedRole } from '../api/auth';

export default function LoginScreen({ route }) {
  const { signIn, verifyMfa } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const selectedRole = route.params?.role || 'merchandiser';
  const [mfaChallenge, setMfaChallenge] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [slowRequest, setSlowRequest] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const errorAnimation = useRef(new Animated.Value(0)).current;
  const spinnerAnimation = useRef(new Animated.Value(0)).current;
  const spinnerRotation = spinnerAnimation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const busy = submitting;

  useEffect(() => {
    Animated.spring(errorAnimation, {
      toValue: error ? 1 : 0,
      useNativeDriver: true,
      tension: 90,
      friction: 10,
    }).start();
  }, [error, errorAnimation]);

  useEffect(() => {
    if (!busy) {
      setSlowRequest(false);
      return undefined;
    }

    setSlowRequest(false);
    const timeout = submitting ? setTimeout(() => setSlowRequest(true), 2000) : null;
    const animation = Animated.loop(Animated.timing(spinnerAnimation, {
      toValue: 1,
      duration: 850,
      useNativeDriver: true,
    }));
    animation.start();

    return () => {
      if (timeout) clearTimeout(timeout);
      animation.stop();
      spinnerAnimation.setValue(0);
    };
  }, [submitting, busy, spinnerAnimation]);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn(email, password, selectedRole);
      if (result.mfaRequired) { setMfaChallenge(result.challenge); setPassword(''); return; }
      rememberSelectedRole(selectedRole).catch((storageError) => {
        console.warn('Could not save the last selected sign-in role:', storageError);
      });
    } catch (err) {
      setError(
        err?.response?.data?.error?.message
          || (err?.response ? 'Login failed. Check your credentials.' : 'Cannot reach the server. It may be waking up; wait a minute and try again.')
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyMfa() {
    setError(null);
    setSubmitting(true);
    try { await verifyMfa(mfaChallenge, mfaCode); }
    catch (err) { setError(err?.response?.data?.error?.message || 'Authenticator verification failed.'); }
    finally { setSubmitting(false); }
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
        <Text style={styles.title}>{mfaChallenge ? 'Verify it’s you' : 'Welcome back'}</Text>
        <Text style={styles.subtitle}>{mfaChallenge ? 'Enter your current authenticator code' : 'Sign in to start your shift'}</Text>

        <View style={styles.card}>
          {mfaChallenge ? <View style={styles.fieldGroup}>
            <Text style={styles.label}>Authenticator code</Text>
            <View style={[styles.inputShell, focusedField === 'mfa' && styles.inputShellFocused]}>
              <Text style={styles.inputIcon}>#</Text>
              <TextInput style={styles.input} keyboardType="number-pad" value={mfaCode} onChangeText={(value) => setMfaCode(value.replace(/\D/g, '').slice(0, 6))} onFocus={() => setFocusedField('mfa')} onBlur={() => setFocusedField(null)} placeholder="6-digit code" placeholderTextColor={colors.muted} maxLength={6} />
            </View>
          </View> : <View style={styles.fieldGroup}>
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
          </View>}

          {!mfaChallenge && <View style={styles.fieldGroup}>
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
          </View>}

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
            accessibilityState={{ disabled: busy, busy }}
            disabled={busy}
            onPress={mfaChallenge ? handleVerifyMfa : handleSubmit}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, busy && styles.buttonDisabled]}
          >
            {submitting ? <Animated.View style={[styles.spinner, { transform: [{ rotate: spinnerRotation }] }]} /> : <Text style={styles.buttonText}>{mfaChallenge ? 'VERIFY CODE' : 'SIGN IN'}</Text>}
          </Pressable>
          {submitting && slowRequest ? <Text accessibilityLiveRegion="polite" style={styles.connecting}>Connecting…</Text> : null}
          {mfaChallenge && <Pressable accessibilityRole="button" onPress={() => { setMfaChallenge(null); setMfaCode(''); setError(null); }}><Text style={styles.loginBack}>Back to sign in</Text></Pressable>}
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
  buttonDisabled: { opacity: 0.78 },
  buttonText: { color: colors.white, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.button, fontWeight: '800', letterSpacing: 1 },
  spinner: { width: 22, height: 22, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.35)', borderTopColor: colors.white, borderRightColor: colors.success, borderRadius: 11 },
  connecting: { color: colors.muted, fontFamily: typography.fontFamilyMedium, fontSize: typography.small, marginTop: spacing.sm, textAlign: 'center' },
  footer: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: 12, marginTop: spacing.lg, textAlign: 'center' },
  loginBack: { color: colors.primary, fontFamily: typography.fontFamilyBold, fontSize: typography.small, marginTop: spacing.md, textAlign: 'center' },
});
