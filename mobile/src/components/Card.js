import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
export default function Card({ children, style }) { const { colors: activeColors } = useTheme(); return <View style={[createStyles(activeColors).card, style]}>{children}</View>; }
const createStyles = (colors) => StyleSheet.create({ card: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, shadowColor: colors.ink, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 } });
