import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '../theme/ThemeContext';
import { radius, spacing, typography } from '../theme/theme';
import Logo from './Logo';

export default function ScreenHeader({ label, onBack }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={8} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
          </Pressable>
        ) : (
          <Logo size={20} iconSize={30} />
        )}
        {!!label && (
          <View style={styles.labelPill}>
            <Text style={styles.sectionLabel}>{label}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    safe: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceContainer,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.margin,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    backBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'flex-start' },
    labelPill: {
      backgroundColor: colors.surfaceContainer,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.full,
    },
    sectionLabel: {
      ...typography.labelSm,
      color: colors.secondary,
      textTransform: 'uppercase',
      fontWeight: '600',
    },
  });
}
