import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
export default function Card({ children, style }) { const { colors: activeColors } = useTheme(); return <View style={[createStyles(activeColors).card, style]}>{children}</View>; }
const createStyles = (colors) => StyleSheet.create({ card: { padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, shadowColor: '#142B36', shadowOpacity: 0.045, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 1 } });
