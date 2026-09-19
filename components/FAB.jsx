import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '../theme/ThemeContext';
import { radius, shadow } from '../theme/theme';

export default function FAB({ onPress, icon = 'add', bottom = 92 }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.fab,
        { backgroundColor: colors.primary, bottom, ...shadow.primaryGlow },
      ]}
      hitSlop={8}
    >
      <MaterialIcons name={icon} size={28} color={colors.onPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
});
