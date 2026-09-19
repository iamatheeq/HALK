import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { loadCategories } from '../store/budgetSlice';
import { loadCategoryActuals, addExpense } from '../store/transactionsSlice';
import { loadLiabilities } from '../store/liabilitiesSlice';
import GlassCard from '../components/GlassCard';
import GlassBackground from '../components/GlassBackground';
import { useGlassAlert } from '../components/GlassAlertProvider';
import { useAppTheme } from '../theme/ThemeContext';
import { radius, spacing, typography, formatCurrency } from '../theme/theme';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const BUCKET_ICON = { must_pay: 'receipt-long', flexible: 'shopping-bag', liability: 'account-balance' };
const BUCKET_ORDER = { must_pay: 0, flexible: 1, liability: 2 };

export default function AddExpenseScreen({ navigation }) {
  const dispatch = useDispatch();
  const { colors, glass } = useAppTheme();
  const styles = createStyles(colors, glass);
  const alert = useGlassAlert();
  const categories = useSelector((s) => s.budget.categories);
  const categoryActuals = useSelector((s) => s.transactions.categoryActuals);
  const owedByLiabilityId = useSelector((s) => s.liabilities.owedByLiabilityId);
  const liabilityItems = useSelector((s) => s.liabilities.items);

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(loadCategories());
    dispatch(loadCategoryActuals());
    dispatch(loadLiabilities());
  }, [dispatch]);

  const liabilityByCategoryId = useMemo(() => {
    return liabilityItems.reduce((acc, l) => {
      acc[l.category_id] = l;
      return acc;
    }, {});
  }, [liabilityItems]);

  const rows = useMemo(() => {
    return categories
      .map((c) => {
        const actual = categoryActuals[c.id] || 0;
        const isLiability = c.bucket === 'liability';
        const remaining = Math.max(0, (c.allocated_amount || 0) - actual);
        const disabled = !isLiability && remaining <= 0;
        const owed = isLiability ? owedByLiabilityId[liabilityByCategoryId[c.id]?.id] ?? 0 : null;
        return { ...c, actual, remaining, disabled, isLiability, owed };
      })
      .sort((a, b) => (BUCKET_ORDER[a.bucket] ?? 9) - (BUCKET_ORDER[b.bucket] ?? 9));
  }, [categories, categoryActuals, owedByLiabilityId, liabilityByCategoryId]);

  const selected = rows.find((r) => r.id === categoryId);

  const close = () => navigation.goBack();

  const save = async () => {
    const value = parseFloat(amount);
    if (Number.isNaN(value) || value <= 0) {
      alert('Invalid amount', 'Enter an amount greater than zero.');
      return;
    }
    if (!selected) {
      alert('Pick a category', 'Choose which category this expense belongs to.');
      return;
    }
    if (!selected.isLiability && value > selected.remaining) {
      alert(
        'Over budget',
        `This exceeds the remaining ${formatCurrency(selected.remaining)} in "${selected.name}".`
      );
      return;
    }
    setSaving(true);
    await dispatch(
      addExpense({ category_id: selected.id, amount: value, date: todayIso(), note })
    );
    setSaving(false);
    close();
  };

  return (
    <GlassBackground>
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Add Expense</Text>
          <Pressable onPress={close} hitSlop={8}>
            <MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.label}>Amount</Text>
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

          <Text style={styles.label}>Category</Text>
          <View style={styles.chipWrap}>
            {rows.map((c) => (
              <Pressable
                key={c.id}
                disabled={c.disabled}
                style={[
                  styles.catChip,
                  categoryId === c.id && styles.catChipActive,
                  c.disabled && styles.catChipDisabled,
                ]}
                onPress={() => setCategoryId(c.id)}
              >
                <MaterialIcons
                  name={c.icon || BUCKET_ICON[c.bucket]}
                  size={14}
                  color={categoryId === c.id ? colors.onPrimary : c.disabled ? colors.outline : colors.onSurfaceVariant}
                />
                <Text style={[styles.catChipText, categoryId === c.id && styles.catChipTextActive, c.disabled && { color: colors.outline }]}>
                  {c.name}
                </Text>
                <Text style={[styles.catChipSub, categoryId === c.id && styles.catChipTextActive]}>
                  {c.isLiability ? `Owed ${formatCurrency(c.owed)}` : `${formatCurrency(c.remaining)} left`}
                </Text>
              </Pressable>
            ))}
            {rows.length === 0 && (
              <Text style={styles.emptyText}>No categories yet — add some from the Builder tab first.</Text>
            )}
          </View>

          {selected?.isLiability && (
            <View style={styles.liabilityNote}>
              <MaterialIcons name="info" size={16} color={colors.tertiary} />
              <Text style={styles.liabilityNoteText}>
                This adds to what you owe on "{selected.name}" — it's borrowed money, so it doesn't touch your own
                budget. Use "Repay" from the Liabilities tab to pay it back from your own funds.
              </Text>
            </View>
          )}

          <Text style={styles.label}>Note</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Optional note"
            placeholderTextColor={colors.outline}
            value={note}
            onChangeText={setNote}
          />

          <Pressable style={styles.saveBtn} onPress={save} disabled={saving}>
            <MaterialIcons name="check" size={20} color={colors.onPrimary} />
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Expense'}</Text>
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
    headerTitle: { ...typography.headlineSm, color: colors.onSurface },
    scrollContent: { padding: spacing.margin, paddingBottom: spacing.xl * 2, gap: spacing.xs },
    label: { ...typography.labelSm, color: colors.secondary, textTransform: 'uppercase', marginTop: spacing.md, marginBottom: 4 },
    amountCardWrap: { marginBottom: spacing.xs },
    amountWrap: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
    rupee: { ...typography.headlineLg, color: colors.secondary, marginRight: 4 },
    amountInput: { ...typography.currencyDisplay, color: colors.onSurface, flex: 1 },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    catChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: glass.chipBackground,
      borderWidth: 1,
      borderColor: glass.border,
      minWidth: '47%',
      gap: 2,
    },
    catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    catChipDisabled: { opacity: 0.5 },
    catChipText: { ...typography.labelLg, color: colors.onSurface },
    catChipTextActive: { color: colors.onPrimary },
    catChipSub: { ...typography.labelSm, color: colors.onSurfaceVariant },
    emptyText: { ...typography.bodySm, color: colors.onSurfaceVariant },
    liabilityNote: {
      flexDirection: 'row',
      gap: spacing.xs,
      backgroundColor: glass.chipBackground,
      padding: spacing.sm,
      borderRadius: radius.default,
      marginTop: spacing.sm,
      alignItems: 'flex-start',
    },
    liabilityNoteText: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1 },
    noteInput: {
      height: 48,
      backgroundColor: glass.inputBackground,
      borderWidth: 1,
      borderColor: glass.inputBorder,
      borderRadius: radius.default,
      paddingHorizontal: spacing.md,
      color: colors.onSurface,
    },
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
