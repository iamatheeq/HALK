import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { repayLiability } from '../store/liabilitiesSlice';
import GlassCard from '../components/GlassCard';
import GlassBackground from '../components/GlassBackground';
import { useGlassAlert } from '../components/GlassAlertProvider';
import { useAppTheme } from '../theme/ThemeContext';
import { radius, spacing, typography, formatCurrency } from '../theme/theme';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const BUCKET_LABEL = { must_pay: 'Must-Pay', flexible: 'Flexible' };
const BUCKET_ORDER = { must_pay: 0, flexible: 1 };
const SAVINGS_KEY = 'savings';

export default function RepayLiabilityScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { colors, glass } = useAppTheme();
  const styles = createStyles(colors, glass);
  const alert = useGlassAlert();
  const { liabilityId } = route.params;

  const liability = useSelector((s) => s.liabilities.items.find((l) => l.id === liabilityId));
  const owed = useSelector((s) => s.liabilities.owedByLiabilityId[liabilityId] ?? 0);
  const categories = useSelector((s) => s.budget.categories);
  const categoryActuals = useSelector((s) => s.transactions.categoryActuals);
  const savingsTotal = useSelector((s) => s.savings.total);

  const [amount, setAmount] = useState('');
  const [allocations, setAllocations] = useState({}); // category_id (or SAVINGS_KEY) -> amount string
  const [saving, setSaving] = useState(false);

  const sourceCategories = useMemo(
    () =>
      categories
        .filter((c) => c.bucket === 'must_pay' || c.bucket === 'flexible')
        .sort((a, b) => (BUCKET_ORDER[a.bucket] ?? 9) - (BUCKET_ORDER[b.bucket] ?? 9)),
    [categories]
  );

  const totalAmount = parseFloat(amount) || 0;
  const allocatedTotal = Object.values(allocations).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
  const remainingToAllocate = totalAmount - allocatedTotal;
  const savingsAllocated = parseFloat(allocations[SAVINGS_KEY]) || 0;

  const setAllocation = (key, value) => {
    setAllocations((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    if (totalAmount <= 0) {
      alert('Enter an amount', 'Enter how much you want to repay.');
      return;
    }
    if (totalAmount > owed) {
      alert('Too much', `This liability only has ${formatCurrency(owed)} owed.`);
      return;
    }
    if (Math.abs(remainingToAllocate) > 0.01) {
      alert(
        'Allocation does not match',
        `You've allocated ${formatCurrency(allocatedTotal)} but the repayment is ${formatCurrency(totalAmount)}. Pick where the rest comes from.`
      );
      return;
    }
    if (savingsAllocated > savingsTotal) {
      alert('Not enough savings', `Only ${formatCurrency(savingsTotal)} is available in Savings.`);
      return;
    }
    const allocationList = Object.entries(allocations)
      .filter(([key]) => key !== SAVINGS_KEY)
      .map(([category_id, v]) => ({ category_id: Number(category_id), amount: parseFloat(v) || 0 }))
      .filter((a) => a.amount > 0);

    setSaving(true);
    await dispatch(
      repayLiability({
        liabilityId,
        categoryId: liability.category_id,
        amount: totalAmount,
        allocations: allocationList,
        savingsAmount: savingsAllocated,
        date: todayIso(),
        note: `Repaid ${liability.name}`,
      })
    );
    setSaving(false);
    navigation.goBack();
  };

  if (!liability) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.emptyText}>This liability is no longer available.</Text>
      </SafeAreaView>
    );
  }

  return (
    <GlassBackground>
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Repay {liability.name}</Text>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <GlassCard strong style={styles.owedCardWrap}>
            <Text style={styles.owedLabel}>Currently Owed</Text>
            <Text style={styles.owedValue}>{formatCurrency(owed)}</Text>
          </GlassCard>

          <Text style={styles.label}>Repayment Amount</Text>
          <GlassCard noPadding style={styles.amountCardWrap}>
            <View style={styles.amountWrap}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={colors.outline}
                value={amount}
                onChangeText={setAmount}
              />
            </View>
          </GlassCard>

          <Text style={styles.label}>Take the money from</Text>
          <Text style={styles.hint}>Split across your budget categories and Savings — it just needs to add up to the repayment amount.</Text>

          <GlassCard style={styles.sourcesCardWrap}>
            <View style={styles.sourceRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sourceName}>Savings</Text>
                <Text style={styles.sourceMeta}>{formatCurrency(savingsTotal)} available</Text>
              </View>
              <View style={styles.sourceAmountWrap}>
                <Text style={styles.rupeeSmall}>₹</Text>
                <TextInput
                  style={styles.sourceAmountInput}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.outline}
                  value={allocations[SAVINGS_KEY] || ''}
                  onChangeText={(v) => setAllocation(SAVINGS_KEY, v)}
                />
              </View>
            </View>

            {sourceCategories.length === 0 ? (
              <Text style={styles.emptyText}>No budget categories yet — add some from the Builder tab if you'd like to split from there too.</Text>
            ) : (
              sourceCategories.map((c) => {
                const remaining = Math.max(0, (c.allocated_amount || 0) - (categoryActuals[c.id] || 0));
                return (
                  <View key={c.id} style={styles.sourceRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sourceName}>{c.name}</Text>
                      <Text style={styles.sourceMeta}>{BUCKET_LABEL[c.bucket]} · {formatCurrency(remaining)} left</Text>
                    </View>
                    <View style={styles.sourceAmountWrap}>
                      <Text style={styles.rupeeSmall}>₹</Text>
                      <TextInput
                        style={styles.sourceAmountInput}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={colors.outline}
                        value={allocations[c.id] || ''}
                        onChangeText={(v) => setAllocation(c.id, v)}
                      />
                    </View>
                  </View>
                );
              })
            )}
          </GlassCard>

          <View style={[styles.totalsRow, Math.abs(remainingToAllocate) > 0.01 && styles.totalsRowWarn]}>
            <Text style={styles.totalsLabel}>Remaining to allocate</Text>
            <Text style={styles.totalsValue}>{formatCurrency(remainingToAllocate)}</Text>
          </View>

          <Pressable style={styles.saveBtn} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color={colors.onPrimary} /> : (
              <>
                <MaterialIcons name="check" size={20} color={colors.onPrimary} />
                <Text style={styles.saveBtnText}>Confirm Repayment</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </GlassBackground>
  );
}

function createStyles(colors, glass) {
  return StyleSheet.create({
    screen: { flex: 1 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    headerTitle: { ...typography.headlineSm, color: colors.onSurface, flex: 1 },
    scrollContent: { padding: spacing.margin, paddingBottom: spacing.xl * 2, gap: spacing.xs },
    owedCardWrap: { alignItems: 'center', marginBottom: spacing.md },
    owedLabel: { ...typography.labelSm, color: colors.secondary, textTransform: 'uppercase' },
    owedValue: { ...typography.currencyDisplay, color: colors.tertiary },
    label: { ...typography.labelSm, color: colors.secondary, textTransform: 'uppercase', marginTop: spacing.md, marginBottom: 4 },
    hint: { ...typography.bodySm, color: colors.onSurfaceVariant, marginBottom: spacing.sm },
    amountCardWrap: { marginBottom: spacing.xs },
    amountWrap: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
    rupee: { ...typography.headlineLg, color: colors.secondary, marginRight: 4 },
    amountInput: { ...typography.currencyDisplay, color: colors.onSurface, flex: 1 },
    emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.lg },
    sourcesCardWrap: { gap: spacing.xs },
    sourceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: glass.chipBackground,
      borderRadius: radius.default,
      padding: spacing.sm,
      marginBottom: spacing.xs,
    },
    sourceName: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '600' },
    sourceMeta: { ...typography.labelSm, color: colors.onSurfaceVariant },
    sourceAmountWrap: { flexDirection: 'row', alignItems: 'center', width: 90, backgroundColor: glass.inputBackground, borderWidth: 1, borderColor: glass.inputBorder, borderRadius: radius.default, paddingHorizontal: spacing.sm },
    rupeeSmall: { ...typography.bodyMd, color: colors.secondary },
    sourceAmountInput: { ...typography.bodyMd, color: colors.onSurface, flex: 1, height: 40, fontWeight: '600' },
    totalsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: radius.default,
      padding: spacing.sm,
      marginTop: spacing.sm,
    },
    totalsRowWarn: { backgroundColor: colors.errorContainer },
    totalsLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
    totalsValue: { ...typography.labelLg, color: colors.onSurface, fontWeight: '700' },
    saveBtn: {
      height: 52,
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      marginTop: spacing.xl,
    },
    saveBtnText: { ...typography.labelLg, color: colors.onPrimary, fontWeight: '700' },
  });
}
