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
import { useAuth } from './AuthContext';
import { theme } from '../theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
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
          || (err?.response ? 'Login failed. Check your credentials.' : 'Cannot reach the server. Connect to the same Wi-Fi as the backend.')
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
        <View style={styles.brandMark}>
          <View style={styles.brandMarkInner}>
            <Text style={styles.brandMarkText}>M</Text>
          </View>
        </View>
        <Text style={styles.title}>Brandsphere Marketing Agency</Text>
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
                placeholderTextColor={theme.colors.muted}
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
                placeholderTextColor={theme.colors.muted}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  brandMark: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
    marginBottom: theme.spacing.md,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    transform: [{ rotate: '-6deg' }],
    shadowColor: theme.colors.primaryDark,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  brandMarkInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
    borderWidth: 2,
    borderColor: theme.colors.primarySoft,
    borderRadius: 17,
  },
  brandMarkText: { color: theme.colors.white, fontSize: 30, fontWeight: '800', transform: [{ rotate: '6deg' }] },
  title: { color: theme.colors.ink, fontSize: theme.typography.title, fontWeight: '800', letterSpacing: 0.2, textAlign: 'center' },
  subtitle: { color: theme.colors.muted, fontSize: theme.typography.subtitle, marginTop: theme.spacing.xs, marginBottom: theme.spacing.xl, textAlign: 'center' },
  card: {
    width: '100%',
    padding: theme.spacing.lg,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
    shadowColor: '#123B32',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  fieldGroup: { marginBottom: theme.spacing.md },
  label: { color: theme.colors.ink, fontSize: theme.typography.label, fontWeight: '700', marginBottom: theme.spacing.xs },
  inputShell: { flexDirection: 'row', alignItems: 'center', minHeight: 54, paddingHorizontal: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.md, backgroundColor: '#FBFDFC' },
  inputShellFocused: { borderColor: theme.colors.primary, backgroundColor: theme.colors.white },
  inputIcon: { width: 24, color: theme.colors.primary, fontSize: 18, textAlign: 'left' },
  input: { flex: 1, color: theme.colors.ink, fontSize: theme.typography.body, paddingVertical: 0 },
  visibilityButton: { alignItems: 'center', justifyContent: 'center', width: 28, marginLeft: theme.spacing.sm },
  visibilityIcon: { color: theme.colors.muted, fontSize: 20 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md, padding: theme.spacing.sm, borderRadius: theme.radii.md, backgroundColor: theme.colors.errorSoft },
  errorIcon: { width: 22, height: 22, marginRight: theme.spacing.sm, borderRadius: 11, backgroundColor: theme.colors.error, color: theme.colors.white, fontSize: 14, fontWeight: '800', lineHeight: 22, textAlign: 'center' },
  errorText: { flex: 1, color: theme.colors.error, fontSize: theme.typography.label, lineHeight: 18 },
  button: { alignItems: 'center', justifyContent: 'center', minHeight: 52, borderRadius: theme.radii.md, backgroundColor: theme.colors.primary, shadowColor: theme.colors.primaryDark, shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  buttonPressed: { backgroundColor: theme.colors.primaryDark, transform: [{ scale: 0.99 }] },
  buttonText: { color: theme.colors.white, fontSize: theme.typography.button, fontWeight: '800', letterSpacing: 1 },
  spinner: { width: 20, height: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.45)', borderTopColor: theme.colors.white, borderRadius: 10 },
  footer: { color: theme.colors.muted, fontSize: 12, marginTop: theme.spacing.lg, textAlign: 'center' },
});
