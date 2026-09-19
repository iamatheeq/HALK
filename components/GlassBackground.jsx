import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../theme/ThemeContext';

/**
 * A soft, colorful gradient wash behind every screen — glassmorphism needs
 * something with variation to blur/refract, or the frosted cards just look flat.
 */
export default function GlassBackground({ children }) {
  const { resolvedScheme, colors } = useAppTheme();
  const isDark = resolvedScheme === 'dark';

  const gradientColors = isDark
    ? ['#0f2417', '#0b1420', '#151033']
    : ['#d9f5e3', '#eef4ff', '#fdeedd'];

  return (
    <View style={[styles.fill, { backgroundColor: colors.surface }]}>
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.blob1, { backgroundColor: isDark ? 'rgba(74,225,118,0.10)' : 'rgba(34,197,94,0.18)' }]} />
      <View style={[StyleSheet.absoluteFill, styles.blob2, { backgroundColor: isDark ? 'rgba(255,185,95,0.08)' : 'rgba(239,153,0,0.12)' }]} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flex: 1 },
  blob1: {
    top: -120,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 320,
    transform: [{ scale: 1 }],
  },
  blob2: {
    top: 260,
    right: -100,
    left: undefined,
    width: 280,
    height: 280,
    borderRadius: 280,
  },
});
