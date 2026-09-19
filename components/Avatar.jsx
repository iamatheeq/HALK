import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';
import { radius } from '../theme/theme';

const PALETTE = ['#006e2f', '#855300', '#545f73', '#213145', '#1b5e20', '#5c3800'];

function colorFor(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export default function Avatar({ uri, name, size = 44 }) {
  const { colors } = useAppTheme();
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
  const bg = colorFor(name || 'halk');

  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius.full }} />;
  }

  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: radius.full, backgroundColor: bg }]}>
      <Text style={[styles.letter, { fontSize: size * 0.42, color: colors.onPrimary }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  letter: { fontWeight: '700' },
});
