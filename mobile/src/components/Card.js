import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';
export default function Card({ children, style }) { return <View style={[styles.card, style]}>{children}</View>; }
const styles = StyleSheet.create({ card: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, shadowColor: '#123B32', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 } });
