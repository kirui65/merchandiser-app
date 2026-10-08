import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';
import { LOGIN_ROLES } from './RoleSelectionScreen';
import { rememberSelectedRole } from '../api/auth';
import { radius, spacing, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

export default function LoginScreen({ role, onBack }) {
  const { signIn, verifyMfa } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);
  const selectedRole = LOGIN_ROLES.find((item) => item.value === role) || LOGIN_ROLES[0];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaChallenge, setMfaChallenge] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState(null);
  const [roleMismatch, setRoleMismatch] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [connectionState, setConnectionState] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [passwordSelection, setPasswordSelection] = useState({ start: 0, end: 0 });
  const passwordInput = useRef(null);
  const errorAnimation = useRef(new Animated.Value(0)).current;
  const spinnerAnimation = useRef(new Animated.Value(0)).current;
  const spinnerRotation = spinnerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    Animated.spring(errorAnimation, {
      toValue: error ? 1 : 0,
      useNativeDriver: true,
      tension: 90,
      friction: 10,
    }).start();
  }, [error, errorAnimation]);

  useEffect(() => {
    if (!submitting) {
      setConnectionState(0);
      return undefined;
    }

    setConnectionState(0);
    const connectingTimer = setTimeout(() => setConnectionState(1), 2000);
    const wakeTimer = setTimeout(() => setConnectionState(2), 8000);
    const spinner = Animated.loop(Animated.timing(spinnerAnimation, {
      toValue: 1,
      duration: 850,
      useNativeDriver: true,
    }));
    spinner.start();

    return () => {
      clearTimeout(connectingTimer);
      clearTimeout(wakeTimer);
      spinner.stop();
      spinnerAnimation.setValue(0);
    };
  }, [submitting, spinnerAnimation]);

  async function handleSubmit() {
    setError(null);
    setRoleMismatch(false);
    setSubmitting(true);
    try {
      const result = await signIn(email.trim(), password, selectedRole.value);
      if (result.mfaRequired) {
        setMfaChallenge(result.challenge);
        setPassword('');
        return;
      }
      rememberSelectedRole(selectedRole.value)
        .catch((storageError) => console.warn('Could not save the last selected sign-in role:', storageError));
    } catch (requestError) {
      const isMismatch = requestError?.response?.status === 403;
      setRoleMismatch(isMismatch);
      setError(
        requestError?.response?.data?.error?.message
          || (requestError?.response
            ? 'Login failed. Check your credentials.'
            : 'Cannot reach the server. Check your connection and try again.'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyMfa() {
    setError(null);
    setRoleMismatch(false);
    setSubmitting(true);
    try {
      await verifyMfa(mfaChallenge, mfaCode);
    } catch (requestError) {
      setError(requestError?.response?.data?.error?.message || 'Authenticator verification failed.');
    } finally {
      setSubmitting(false);
    }
  }

  function togglePasswordVisibility() {
    setShowPassword((visible) => !visible);
    if (focusedField === 'password') {
      requestAnimationFrame(() => {
        passwordInput.current?.focus();
        passwordInput.current?.setNativeProps({ selection: passwordSelection });
      });
    }
  }

  const accent = colors.roleAccents[selectedRole.value];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: spacing.sm, paddingBottom: spacing.lg + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to role selection"
              onPress={onBack}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <Ionicons name="arrow-back" size={21} color={colors.ink} />
            </Pressable>
            <View style={styles.logoPanel}>
              <Ionicons name={selectedRole.icon} size={22} color={accent} />
              <Text style={styles.roleBadgeText}>{selectedRole.label}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose a different role"
              onPress={onBack}
              style={styles.changeButton}
            >
              <Text style={[styles.changeText, { color: accent }]}>Change</Text>
            </Pressable>
          </View>

          <Text style={styles.title}>{mfaChallenge ? 'Verify it’s you' : 'Welcome back'}</Text>
          <Text style={styles.subtitle}>
            {mfaChallenge ? 'Enter your current authenticator code' : `Sign in as ${selectedRole.label}`}
          </Text>

          <View style={styles.card}>
            {mfaChallenge ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Authenticator code</Text>
                <View style={[styles.inputShell, focusedField === 'mfa' && styles.inputShellFocused]}>
                  <Ionicons name="keypad-outline" size={19} color={colors.muted} style={styles.inputIcon} />
                  <TextInput
                    accessibilityLabel="Authenticator code"
                    style={styles.input}
                    keyboardType="number-pad"
                    value={mfaCode}
                    onChangeText={(value) => setMfaCode(value.replace(/\D/g, '').slice(0, 6))}
                    onFocus={() => setFocusedField('mfa')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="6-digit code"
                    placeholderTextColor={colors.muted}
                    maxLength={6}
                  />
                </View>
              </View>
            ) : (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Email</Text>
                  <View style={[styles.inputShell, focusedField === 'email' && styles.inputShellFocused]}>
                    <Ionicons name="mail-outline" size={19} color={colors.muted} style={styles.inputIcon} />
                    <TextInput
                      accessibilityLabel="Email address"
                      style={styles.input}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="you@company.com"
                      placeholderTextColor={colors.muted}
                      returnKeyType="next"
                    />
                  </View>
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={[styles.inputShell, focusedField === 'password' && styles.inputShellFocused]}>
                    <Ionicons name="lock-closed-outline" size={19} color={colors.muted} style={styles.inputIcon} />
                    <TextInput
                      ref={passwordInput}
                      accessibilityLabel="Password"
                      style={styles.input}
                      secureTextEntry={!showPassword}
                      textContentType="password"
                      value={password}
                      onChangeText={setPassword}
                      onSelectionChange={(event) => setPasswordSelection(event.nativeEvent.selection)}
                      selection={passwordSelection}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Enter your password"
                      placeholderTextColor={colors.muted}
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                      accessibilityState={{ selected: showPassword }}
                      onPress={togglePasswordVisibility}
                      style={({ pressed }) => [styles.visibilityButton, pressed && styles.pressed]}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={colors.muted}
                      />
                    </Pressable>
                  </View>
                </View>
              </>
            )}

            {error ? (
              <Animated.View
                accessibilityLiveRegion="polite"
                style={[
                  styles.errorBanner,
                  {
                    opacity: errorAnimation,
                    transform: [{
                      translateY: errorAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-8, 0],
                      }),
                    }],
                  },
                ]}
              >
                <Ionicons name="warning-outline" size={20} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            ) : null}

            {roleMismatch ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose a different role"
                onPress={onBack}
                style={styles.mismatchAction}
              >
                <Text style={[styles.mismatchText, { color: accent }]}>Choose a different role</Text>
                <Ionicons name="arrow-forward" size={16} color={accent} />
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={mfaChallenge ? 'Verify sign-in code' : 'Sign in'}
              accessibilityState={{ disabled: submitting, busy: submitting }}
              disabled={submitting}
              onPress={mfaChallenge ? handleVerifyMfa : handleSubmit}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: accent },
                pressed && styles.buttonPressed,
                submitting && styles.buttonDisabled,
              ]}
            >
              {submitting ? (
                <Animated.View style={[styles.spinner, { transform: [{ rotate: spinnerRotation }] }]} />
              ) : (
                <Text style={styles.buttonText}>{mfaChallenge ? 'VERIFY CODE' : 'SIGN IN'}</Text>
              )}
            </Pressable>
            {submitting && connectionState > 0 ? (
              <Text accessibilityLiveRegion="polite" style={styles.connecting}>
                {connectionState === 1
                  ? 'Connecting…'
                  : 'Server is waking up, this can take up to a minute'}
              </Text>
            ) : null}
            {mfaChallenge ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Return to email and password sign in"
                onPress={() => {
                  setMfaChallenge(null);
                  setMfaCode('');
                  setError(null);
                }}
                style={styles.mfaBack}
              >
                <Text style={styles.linkText}>Back to sign in</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.footer}>Secure access for your field team</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  logoPanel: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  roleBadgeText: {
    color: colors.ink,
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.small,
    fontWeight: '700',
  },
  changeButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  changeText: { fontFamily: typography.fontFamilyBold, fontSize: typography.small, fontWeight: '700' },
  title: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: typography.title,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
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
  label: {
    color: colors.ink,
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.small,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  inputShellFocused: { borderColor: colors.primary },
  inputIcon: { width: 28 },
  input: {
    flex: 1,
    color: colors.ink,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    paddingVertical: 0,
  },
  visibilityButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
    borderRadius: radius.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.errorSoft,
  },
  errorText: {
    flex: 1,
    color: colors.error,
    fontFamily: typography.fontFamily,
    fontSize: typography.small,
    lineHeight: 18,
  },
  mismatchAction: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  mismatchText: { fontFamily: typography.fontFamilyBold, fontSize: typography.small, fontWeight: '700' },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    borderRadius: radius.md,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  buttonPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  buttonDisabled: { opacity: 0.78 },
  buttonText: {
    color: colors.white,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: typography.button,
    fontWeight: '800',
    letterSpacing: 1,
  },
  spinner: {
    width: 22,
    height: 22,
    borderWidth: 2.5,
    borderColor: colors.primarySoft,
    borderTopColor: colors.white,
    borderRadius: radius.pill,
  },
  connecting: {
    color: colors.muted,
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.small,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  mfaBack: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  linkText: { color: colors.primary, fontFamily: typography.fontFamilyBold, fontSize: typography.small },
  footer: {
    color: colors.muted,
    fontFamily: typography.fontFamily,
    fontSize: 12,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  pressed: { opacity: 0.8 },
});
