import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import GlassCard from '../components/GlassCard';
import GlassBackground from '../components/GlassBackground';
import { useAppTheme } from '../theme/ThemeContext';
import { radius, spacing, typography } from '../theme/theme';

const ITEMS = [
  { route: 'Reports', icon: 'bar-chart', title: 'Reports', subtitle: 'Spending breakdown, trends, PDF/CSV export' },
  { route: 'Settings', icon: 'settings', title: 'Settings', subtitle: 'Profile, backup, appearance, account' },
];

export default function MoreScreen({ navigation }) {
  const { colors, glass } = useAppTheme();
  const styles = createStyles(colors, glass);

  return (
    <GlassBackground>
      <View style={styles.screen}>
        <ScreenHeader label="More" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <GlassCard noPadding style={styles.cardWrap}>
            {ITEMS.map((item, i) => (
              <Pressable
                key={item.route}
                style={[styles.row, i < ITEMS.length - 1 && styles.rowBorder]}
                onPress={() => navigation.navigate(item.route)}
              >
                <View style={styles.rowIcon}>
                  <MaterialIcons name={item.icon} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.secondary} />
              </Pressable>
            ))}
          </GlassCard>
        </ScrollView>
      </View>
    </GlassBackground>
  );
}

function createStyles(colors, glass) {
  return StyleSheet.create({
    screen: { flex: 1 },
    scrollContent: { padding: spacing.margin, gap: spacing.md, paddingBottom: spacing.xl * 3 },
    cardWrap: { overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
    rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: glass.border },
    rowIcon: { width: 36, height: 36, borderRadius: radius.default, backgroundColor: glass.chipBackground, alignItems: 'center', justifyContent: 'center' },
    rowTitle: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '600' },
    rowSubtitle: { ...typography.bodySm, color: colors.onSurfaceVariant },
  });
}
