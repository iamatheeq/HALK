import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '../theme/ThemeContext';
import { radius } from '../theme/theme';

/**
 * The core "glassmorphism" building block used for every card across the app —
 * a blurred, translucent surface with a soft light-refraction border and a
 * diffused shadow underneath for a sense of depth.
 */
export default function GlassCard({ children, style, contentStyle, strong = false, radius: r = radius.lg, noPadding = false }) {
  const { glass } = useAppTheme();

  return (
    <View style={[styles.shadowWrap, { borderRadius: r, shadowColor: glass.shadowColor }, style]}>
      <BlurView intensity={glass.intensity} tint={glass.tint} style={[styles.blur, { borderRadius: r }]}>
        <View
          style={[
            styles.overlay,
            {
              borderRadius: r,
              backgroundColor: strong ? glass.backgroundStrong : glass.background,
              borderColor: glass.border,
            },
            !noPadding && styles.padding,
            contentStyle,
          ]}
        >
          {children}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 6,
  },
  blur: {
    overflow: 'hidden',
  },
  overlay: {
    borderWidth: 1,
  },
  padding: {
    padding: 16,
  },
});
