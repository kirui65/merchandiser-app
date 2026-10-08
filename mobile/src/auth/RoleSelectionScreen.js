import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getLastSelectedRole, rememberSelectedRole } from '../api/auth';
import { radius, spacing, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

export const LOGIN_ROLES = [
  {
    value: 'merchandiser',
    label: 'Merchandiser',
    description: 'Outlet sales, stock checks and routes',
    icon: 'storefront-outline',
  },
  {
    value: 'brand_ambassador',
    label: 'Brand Ambassador',
    description: 'Activations, samples and surveys',
    icon: 'megaphone-outline',
  },
  {
    value: 'telemarketer',
    label: 'Telemarketer',
    description: 'Leads, calls and follow-ups',
    icon: 'call-outline',
  },
  {
    value: 'team_leader',
    label: 'Team Leader',
    description: 'Team performance and field support',
    icon: 'people-outline',
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Company-wide operations and reporting',
    icon: 'briefcase-outline',
  },
];

export default function RoleSelectionScreen({ onSelectRole, selectedRole }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [lastRole, setLastRole] = useState(null);
  const entrances = useRef(LOGIN_ROLES.map(() => new Animated.Value(0))).current;
  const presses = useRef(LOGIN_ROLES.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    let mounted = true;
    getLastSelectedRole()
      .then((role) => {
        if (mounted && LOGIN_ROLES.some((item) => item.value === role)) setLastRole(role);
      })
      .catch((error) => console.warn('Could not load the last selected sign-in role:', error));

    Animated.stagger(
      70,
      entrances.map((value) => Animated.timing(value, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      })),
    ).start();

    return () => { mounted = false; };
  }, [entrances]);

  function selectRole(role) {
    setLastRole(role.value);
    rememberSelectedRole(role.value)
      .catch((error) => console.warn('Could not save the last selected sign-in role:', error));
    onSelectRole(role.value);
  }

  function animatePress(index, value) {
    Animated.spring(presses[index], {
      toValue: value,
      speed: 32,
      bounciness: 5,
      useNativeDriver: true,
    }).start();
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoPanel}>
          <Image
            source={require('../../assets/brandsphere-wordmark.jpg')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Brandsphere Marketing Agency"
          />
        </View>
        <Text style={styles.title}>Who's signing in?</Text>
        <Text style={styles.subtitle}>Choose your role to continue</Text>

        <View style={styles.grid}>
          {LOGIN_ROLES.map((role, index) => {
            const selected = (selectedRole || lastRole) === role.value;
            const accent = colors.roleAccents[role.value];
            return (
              <Animated.View
                key={role.value}
                style={[
                  styles.cardWrap,
                  index === ROLES.length - 1 && styles.lastCardWrap,
                  {
                    opacity: entrances[index],
                    transform: [
                      {
                        translateY: entrances[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [14, 0],
                        }),
                      },
                      { scale: presses[index] },
                    ],
                  },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${role.label}. ${role.description}`}
                  accessibilityState={{ selected }}
                  onPress={() => selectRole(role)}
                  onPressIn={() => animatePress(index, 0.98)}
                  onPressOut={() => animatePress(index, 1)}
                  style={[
                    styles.card,
                    selected && { borderColor: accent, backgroundColor: colors.surface },
                  ]}
                >
                  <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name={role.icon} size={23} color={accent} />
                  </View>
                  <View style={styles.copy}>
                    <Text style={styles.roleName}>{role.label}</Text>
                    <Text style={styles.description}>{role.description}</Text>
                  </View>
                  {selected ? <Ionicons name="checkmark-circle" size={20} color={accent} /> : null}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
        <Text style={styles.footer}>Secure access for your field team</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  logoPanel: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 320,
    height: 108,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.logoPanel,
  },
  logo: { width: '100%', height: '100%' },
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
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  cardWrap: { width: '48.5%' },
  lastCardWrap: { width: '100%' },
  card: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  iconCircle: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  copy: { flex: 1 },
  roleName: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: typography.small,
    fontWeight: '800',
  },
  description: {
    color: colors.muted,
    fontFamily: typography.fontFamily,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },
  footer: {
    color: colors.muted,
    fontFamily: typography.fontFamily,
    fontSize: 12,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
