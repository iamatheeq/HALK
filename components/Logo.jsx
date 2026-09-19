import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';

const ICON = require('../assets/icon.png');

/**
 * Wordmark "HALK" with H/L in the neutral ink color and A/K in brand green,
 * matching the mark's two-tone treatment.
 */
export default function Logo({ size = 22, showIcon = true, iconSize }) {
  const { colors } = useAppTheme();
  const resolvedIconSize = iconSize ?? size * 1.4;

  return (
    <View style={styles.row}>
      {showIcon && (
        <Image source={ICON} style={{ width: resolvedIconSize, height: resolvedIconSize }} resizeMode="contain" />
      )}
      <Text style={{ fontSize: size, fontWeight: '800', letterSpacing: -0.5 }}>
        <Text style={{ color: colors.onSurface }}>H</Text>
        <Text style={{ color: colors.primary }}>A</Text>
        <Text style={{ color: colors.onSurface }}>L</Text>
        <Text style={{ color: colors.primary }}>K</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
