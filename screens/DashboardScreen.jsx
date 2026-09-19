import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import GlassCard from '../components/GlassCard';
import GlassBackground from '../components/GlassBackground';
import { loadCategories, loadMonthlyBaseline, loadCycleSavingsDeposits, selectAllocationSummary } from '../store/budgetSlice';
import { loadCategoryActuals } from '../store/transactionsSlice';
import { loadLiabilities, selectTotalOwed } from '../store/liabilitiesSlice';
import { loadSavings } from '../store/savingsSlice';
import { useAppTheme } from '../theme/ThemeContext';
import { radius, spacing, typography, formatCurrency } from '../theme/theme';

const BUCKET_META = {
  must_pay: { label: 'Must-Pay', icon: 'receipt-long' },
  flexible: { label: 'Flexible', icon: 'shopping-bag' },
  liability: { label: 'Liability', icon: 'account-balance' },
};
const BUCKET_ORDER = { must_pay: 0, flexible: 1, liability: 2 };

function CategoryCard({ category, actual, colors, glass }) {
  const styles = createStyles(colors, glass);
  const meta = BUCKET_META[category.bucket] ?? BUCKET_META.flexible;
  const isLiability = category.bucket === 'liability';
  const remaining = Math.max(0, (category.allocated_amount || 0) - actual);
  const pct = category.allocated_amount > 0 ? Math.min(100, (actual / category.allocated_amount) * 100) : 0;

  return (
    <GlassCard style={styles.card} contentStyle={styles.cardContent}>
      <View style={styles.cardTopRow}>
        <View style={styles.cardIcon}>
          <MaterialIcons name={category.icon || meta.icon} size={18} color={colors.primary} />
        </View>
        <Text style={styles.cardBucket}>{meta.label}</Text>
      </View>
      <Text style={styles.cardName} numberOfLines={1}>{category.name}</Text>
      {isLiability ? (
        <Text style={styles.cardSpent}>{formatCurrency(actual)} spent</Text>
      ) : (
        <>
          <Text style={styles.cardRemaining}>{formatCurrency(remaining)} left</Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${pct}%`, backgroundColor: pct >= 100 ? colors.error : colors.primary },
              ]}
            />
          </View>
        </>
      )}
    </GlassCard>
  );
}

export default function DashboardScreen({ navigation }) {
  const dispatch = useDispatch();
  const { colors, glass } = useAppTheme();
  const styles = createStyles(colors, glass);
  const summary = useSelector(selectAllocationSummary);
  const categories = useSelector((s) => s.budget.categories);
  const categoryActuals = useSelector((s) => s.transactions.categoryActuals);
  const totalOwed = useSelector(selectTotalOwed);
  const totalSavings = useSelector((s) => s.savings.total);

  useFocusEffect(
    useCallback(() => {
      dispatch(loadCategories());
      dispatch(loadMonthlyBaseline());
      dispatch(loadCycleSavingsDeposits());
      dispatch(loadCategoryActuals());
      dispatch(loadLiabilities());
      dispatch(loadSavings());
    }, [dispatch])
  );

  // Liability categories track debt owed, not baseline spend — borrowing doesn't touch
  // your own money, and a repayment's real cash impact is already counted through the
  // must-pay/flexible categories (or Savings) that funded it. Including liability
  // actuals here would double-count (or cancel out) against those source entries.
  const totalSpent = categories
    .filter((c) => c.bucket !== 'liability')
    .reduce((sum, c) => sum + (categoryActuals[c.id] || 0), 0);
  // Remaining Balance is just what's left in Must-Pay + Flexible — not baseline minus
  // spend, which would also fold in Savings deposits and still-unallocated money and
  // overstate what you actually have left to spend from your budgeted categories.
  const remainingBalance = summary.allocated - totalSpent;

  return (
    <GlassBackground>
      <View style={styles.screen}>
        <ScreenHeader label="Dashboard" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <GlassCard strong style={styles.heroCardWrap}>
            <Text style={styles.heroLabel}>Remaining Balance</Text>
            <Text style={[styles.heroValue, remainingBalance < 0 && { color: colors.error }]}>
              {formatCurrency(remainingBalance)}
            </Text>
            <View style={styles.heroRow}>
              <View style={styles.heroStat}>
                <MaterialIcons name="account-balance-wallet" size={16} color={colors.secondary} />
                <View>
                  <Text style={styles.heroStatLabel}>Baseline</Text>
                  <Text style={styles.heroStatValue}>{formatCurrency(summary.baseline)}</Text>
                </View>
              </View>
              <View style={styles.heroStat}>
                <MaterialIcons name="trending-down" size={16} color={colors.secondary} />
                <View>
                  <Text style={styles.heroStatLabel}>Spent</Text>
                  <Text style={styles.heroStatValue}>{formatCurrency(totalSpent)}</Text>
                </View>
              </View>
              {totalOwed > 0 && (
                <View style={styles.heroStat}>
                  <MaterialIcons name="account-balance" size={16} color={colors.tertiary} />
                  <View>
                    <Text style={styles.heroStatLabel}>Owed</Text>
                    <Text style={[styles.heroStatValue, { color: colors.tertiary }]}>{formatCurrency(totalOwed)}</Text>
                  </View>
                </View>
              )}
            </View>
          </GlassCard>

          <Pressable onPress={() => navigation.navigate('Savings')}>
            <GlassCard style={styles.savingsCardWrap}>
              <View style={styles.savingsIcon}>
                <MaterialIcons name="account-balance-wallet" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.savingsLabel}>Total Savings</Text>
                <Text style={styles.savingsValue}>{formatCurrency(totalSavings)}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.secondary} />
            </GlassCard>
          </Pressable>

          <Pressable style={styles.viewAllRow} onPress={() => navigation.navigate('ExpenseList')}>
            <MaterialIcons name="receipt-long" size={16} color={colors.primary} />
            <Text style={styles.viewAllText}>View all expenses</Text>
            <MaterialIcons name="chevron-right" size={18} color={colors.secondary} />
          </Pressable>

          {categories.length === 0 ? (
            <GlassCard style={styles.emptyCardWrap}>
              <MaterialIcons name="tune" size={26} color={colors.secondary} />
              <Text style={styles.emptyText}>No budget categories yet. Head to the Builder tab to allocate your income.</Text>
            </GlassCard>
          ) : (
            <View>
              <Text style={styles.sectionTitle}>Categories</Text>
              <View style={styles.cardGrid}>
                {[...categories]
                  .sort((a, b) => (BUCKET_ORDER[a.bucket] ?? 9) - (BUCKET_ORDER[b.bucket] ?? 9))
                  .map((c) => (
                    <CategoryCard key={c.id} category={c} actual={categoryActuals[c.id] || 0} colors={colors} glass={glass} />
                  ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </GlassBackground>
  );
}

function createStyles(colors, glass) {
  return StyleSheet.create({
    screen: { flex: 1 },
    scrollContent: { padding: spacing.margin, gap: spacing.lg, paddingBottom: spacing.xl * 3 },
    heroCardWrap: { gap: spacing.sm },
    heroLabel: { ...typography.labelSm, color: colors.secondary, textTransform: 'uppercase' },
    heroValue: { ...typography.currencyDisplay, color: colors.primary },
    heroRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs, flexWrap: 'wrap' },
    heroStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    heroStatLabel: { ...typography.labelSm, color: colors.secondary },
    heroStatValue: { ...typography.labelLg, color: colors.onSurface, fontWeight: '700' },
    savingsCardWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    savingsIcon: { width: 36, height: 36, borderRadius: radius.default, backgroundColor: glass.chipBackground, alignItems: 'center', justifyContent: 'center' },
    savingsLabel: { ...typography.labelSm, color: colors.secondary, textTransform: 'uppercase' },
    savingsValue: { ...typography.labelLg, color: colors.onSurface, fontWeight: '700' },
    viewAllRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: glass.chipBackground,
      borderRadius: radius.default,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    viewAllText: { ...typography.labelLg, color: colors.onSurface, flex: 1 },
    emptyCardWrap: { alignItems: 'center', gap: spacing.sm },
    emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center' },
    sectionTitle: { ...typography.headlineSm, color: colors.onSurface, marginBottom: spacing.sm },
    cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    card: { width: '48%' },
    cardContent: { gap: 4 },
    cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardIcon: { width: 28, height: 28, borderRadius: radius.default, backgroundColor: glass.chipBackground, alignItems: 'center', justifyContent: 'center' },
    cardBucket: { ...typography.labelSm, color: colors.secondary, textTransform: 'uppercase' },
    cardName: { ...typography.labelLg, color: colors.onSurface, marginTop: 4 },
    cardRemaining: { ...typography.bodySm, color: colors.onSurfaceVariant },
    cardSpent: { ...typography.bodySm, color: colors.tertiary },
    progressTrack: { height: 5, borderRadius: radius.full, backgroundColor: colors.surfaceContainer, overflow: 'hidden', marginTop: 4 },
    progressFill: { height: '100%' },
  });
}
