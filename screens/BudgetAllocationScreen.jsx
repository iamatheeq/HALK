import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import GlassCard from '../components/GlassCard';
import GlassBackground from '../components/GlassBackground';
import { useGlassAlert } from '../components/GlassAlertProvider';
import {
  loadCategories,
  loadMonthlyBaseline,
  loadCycleSavingsDeposits,
  updateMonthlyBaseline,
  addCategory,
  editCategory,
  removeCategory,
  closeBudgetCycle,
  selectAllocationSummary,
  selectRemainingAllocatable,
} from '../store/budgetSlice';
import { loadCategoryActuals } from '../store/transactionsSlice';
import { loadSavings } from '../store/savingsSlice';
import { useAppTheme } from '../theme/ThemeContext';
import { radius, spacing, typography, formatCurrency } from '../theme/theme';

const BUCKETS = [
  { key: 'must_pay', title: 'Must-Pay Bills', icon: 'receipt-long', accent: 'inverseSurface', onAccent: 'inverseOnSurface' },
  { key: 'flexible', title: 'Flexible Spending', icon: 'shopping-bag', accent: 'tertiaryContainer', onAccent: 'onTertiaryContainer' },
];

function BucketSection({ bucket, items, remainingAllocatable, onAdd, onEdit, onRemove, colors, glass }) {
  const styles = createStyles(colors, glass);
  const alert = useGlassAlert();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');

  const accent = colors[bucket.accent];
  const onAccent = colors[bucket.onAccent];

  const startAdd = () => {
    setEditingId(null);
    setName('');
    setAmount('');
    setAdding(true);
  };

  const startEdit = (item) => {
    setAdding(false);
    setEditingId(item.id);
    setName(item.name);
    setAmount(String(item.allocated_amount));
  };

  const cancel = () => {
    setAdding(false);
    setEditingId(null);
  };

  const submit = () => {
    const value = parseFloat(amount);
    if (!name.trim() || Number.isNaN(value) || value <= 0) {
      alert('Check your entry', 'Enter a name and an amount greater than zero.');
      return;
    }
    const existing = editingId ? items.find((i) => i.id === editingId) : null;
    const delta = value - (existing ? existing.allocated_amount : 0);
    if (delta > remainingAllocatable) {
      alert(
        'Over your baseline',
        `Only ${formatCurrency(remainingAllocatable)} is unallocated. Reduce the amount or raise your monthly baseline.`
      );
      return;
    }
    if (editingId) {
      onEdit({ id: editingId, name: name.trim(), amount: value });
    } else {
      onAdd({ name: name.trim(), amount: value });
    }
    setAdding(false);
    setEditingId(null);
  };

  return (
    <GlassCard noPadding style={styles.bucketCardWrap}>
      <View style={[styles.bucketHeader, { backgroundColor: accent }]}>
        <MaterialIcons name={bucket.icon} size={18} color={onAccent} />
        <Text style={[styles.bucketTitle, { color: onAccent }]}>{bucket.title}</Text>
      </View>

      <View style={styles.bucketBody}>
        {items.length === 0 && !adding && <Text style={styles.emptyHint}>No items yet.</Text>}

        {items.map((item) =>
          editingId === item.id ? (
            <View key={item.id} style={styles.editorRow}>
              <TextInput style={styles.nameInput} value={name} onChangeText={setName} placeholderTextColor={colors.outline} />
              <View style={styles.amountWrap}>
                <Text style={styles.rupee}>₹</Text>
                <TextInput style={styles.amountInput} keyboardType="numeric" value={amount} onChangeText={setAmount} placeholderTextColor={colors.outline} />
              </View>
              <Pressable style={[styles.iconBtn, { backgroundColor: accent }]} onPress={submit}>
                <MaterialIcons name="check" size={18} color={onAccent} />
              </Pressable>
              <Pressable style={styles.iconBtnGhost} onPress={cancel}>
                <MaterialIcons name="close" size={18} color={colors.secondary} />
              </Pressable>
            </View>
          ) : (
            <View key={item.id} style={styles.itemRow}>
              <Pressable style={styles.itemLeft} onPress={() => startEdit(item)}>
                <MaterialIcons name={bucket.icon} size={16} color={colors.secondary} />
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
              </Pressable>
              <View style={styles.itemRight}>
                <Text style={styles.itemAmount}>{formatCurrency(item.allocated_amount)}</Text>
                <Pressable onPress={() => onRemove(item.id)} hitSlop={8}>
                  <MaterialIcons name="delete-outline" size={16} color={colors.error} />
                </Pressable>
              </View>
            </View>
          )
        )}

        {adding ? (
          <View style={styles.editorRow}>
            <TextInput
              style={styles.nameInput}
              placeholder="Name"
              placeholderTextColor={colors.outline}
              value={name}
              onChangeText={setName}
              autoFocus
            />
            <View style={styles.amountWrap}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={colors.outline}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>
            <Pressable style={[styles.iconBtn, { backgroundColor: accent }]} onPress={submit}>
              <MaterialIcons name="check" size={18} color={onAccent} />
            </Pressable>
            <Pressable style={styles.iconBtnGhost} onPress={cancel}>
              <MaterialIcons name="close" size={18} color={colors.secondary} />
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.addBtn} onPress={startAdd}>
            <MaterialIcons name="add-circle" size={18} color={colors.onSurface} />
            <Text style={styles.addBtnText}>Add item</Text>
          </Pressable>
        )}
      </View>
    </GlassCard>
  );
}

export default function BudgetAllocationScreen() {
  const dispatch = useDispatch();
  const { colors, glass } = useAppTheme();
  const styles = createStyles(colors, glass);
  const alert = useGlassAlert();
  const categories = useSelector((s) => s.budget.categories);
  const categoryActuals = useSelector((s) => s.transactions.categoryActuals);
  const summary = useSelector(selectAllocationSummary);
  const remainingAllocatable = useSelector(selectRemainingAllocatable);
  const [editingBaseline, setEditingBaseline] = useState(false);
  const [baselineInput, setBaselineInput] = useState(String(summary.baseline));
  const [closing, setClosing] = useState(false);
  const [closeToast, setCloseToast] = useState(null);

  useFocusEffect(
    useCallback(() => {
      dispatch(loadCategories());
      dispatch(loadMonthlyBaseline());
      dispatch(loadCycleSavingsDeposits());
      dispatch(loadCategoryActuals());
      dispatch(loadSavings());
    }, [dispatch])
  );

  const itemsByBucket = useMemo(() => {
    return BUCKETS.reduce((acc, b) => {
      acc[b.key] = categories.filter((c) => c.bucket === b.key);
      return acc;
    }, {});
  }, [categories]);

  const commitBaseline = () => {
    const value = parseFloat(baselineInput);
    if (!Number.isNaN(value) && value >= 0) {
      dispatch(updateMonthlyBaseline(value));
    } else {
      setBaselineInput(String(summary.baseline));
    }
    setEditingBaseline(false);
  };

  const mustFlexSpent = categories
    .filter((c) => c.bucket === 'must_pay' || c.bucket === 'flexible')
    .reduce((sum, c) => sum + (categoryActuals[c.id] || 0), 0);

  const handleCloseBudget = () => {
    alert(
      'Close this budget cycle?',
      `You've spent ${formatCurrency(mustFlexSpent)} of your Must-Pay + Flexible budget. Whatever's left over — plus anything never allocated — moves into your default Savings goal. Your baseline stays the same (edit it yourself if your income changed). Every category's "spent so far" resets to ₹0. Nothing is deleted — your history stays in Reports.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close & Reset',
          onPress: async () => {
            setClosing(true);
            const result = await dispatch(closeBudgetCycle());
            setClosing(false);
            if (closeBudgetCycle.fulfilled.match(result)) {
              const { deposited, newSavingsTotal } = result.payload;
              setCloseToast(
                deposited > 0
                  ? `${formatCurrency(deposited)} moved into Savings — total is now ${formatCurrency(newSavingsTotal)}.`
                  : `Nothing left over this cycle — Savings stays at ${formatCurrency(newSavingsTotal)}.`
              );
              setTimeout(() => setCloseToast(null), 6000);
            }
          },
        },
      ]
    );
  };

  return (
    <GlassBackground>
      <View style={styles.screen}>
        <ScreenHeader label="Budget Builder" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <GlassCard strong style={styles.summaryCardWrap}>
            <View style={styles.summaryTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>Monthly Baseline</Text>
                {editingBaseline ? (
                  <TextInput
                    style={styles.baselineInput}
                    keyboardType="numeric"
                    autoFocus
                    value={baselineInput}
                    onChangeText={setBaselineInput}
                    onBlur={commitBaseline}
                    onSubmitEditing={commitBaseline}
                  />
                ) : (
                  <Pressable
                    onPress={() => {
                      setBaselineInput(String(summary.baseline));
                      setEditingBaseline(true);
                    }}
                  >
                    <View style={styles.baselineRow}>
                      <Text style={styles.summaryBig}>{formatCurrency(summary.baseline)}</Text>
                      <MaterialIcons name="edit" size={16} color={colors.secondary} />
                    </View>
                  </Pressable>
                )}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.summaryLabel, { color: colors.primary }]}>Unallocated</Text>
                <Text style={[styles.summaryUnallocated, summary.isOverAllocated && { color: colors.error }]}>
                  {formatCurrency(remainingAllocatable)}
                </Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressSeg, { width: `${Math.min(100, summary.percentages.must_pay)}%`, backgroundColor: colors.inverseSurface }]} />
              <View style={[styles.progressSeg, { width: `${Math.min(100, summary.percentages.flexible)}%`, backgroundColor: colors.tertiaryContainer }]} />
              <View style={[styles.progressSeg, { width: `${Math.min(100, summary.percentages.savings)}%`, backgroundColor: colors.primaryContainer }]} />
            </View>

            <View style={styles.spentRow}>
              <Text style={styles.spentLabel}>Spent this cycle</Text>
              <Text style={styles.spentValue}>{formatCurrency(mustFlexSpent)}</Text>
            </View>
          </GlassCard>

          {!!closeToast && (
            <GlassCard style={styles.toastWrap}>
              <View style={styles.toastRow}>
                <MaterialIcons name="check-circle" size={20} color={colors.primary} />
                <Text style={styles.toastText}>{closeToast}</Text>
              </View>
            </GlassCard>
          )}

          {BUCKETS.map((bucket) => (
            <BucketSection
              key={bucket.key}
              bucket={bucket}
              items={itemsByBucket[bucket.key] || []}
              remainingAllocatable={remainingAllocatable}
              onAdd={({ name, amount }) =>
                dispatch(addCategory({ name, bucket: bucket.key, amount, icon: bucket.icon, color: colors[bucket.accent] }))
              }
              onEdit={({ id, name, amount }) => dispatch(editCategory({ id, name, amount }))}
              onRemove={(id) => dispatch(removeCategory(id))}
              colors={colors}
              glass={glass}
            />
          ))}

          <Pressable style={styles.closeBtn} onPress={handleCloseBudget} disabled={closing}>
            {closing ? (
              <ActivityIndicator size="small" color={colors.inverseOnSurface} />
            ) : (
              <MaterialIcons name="restart-alt" size={18} color={colors.inverseOnSurface} />
            )}
            <Text style={styles.closeBtnText}>Close Budget & Start Fresh</Text>
          </Pressable>

          <View style={styles.privacyRow}>
            <MaterialIcons name="lock" size={16} color={colors.primary} />
            <Text style={styles.privacyText}>All allocations are stored locally and encrypted.</Text>
          </View>
        </ScrollView>
      </View>
    </GlassBackground>
  );
}

function createStyles(colors, glass) {
  return StyleSheet.create({
    screen: { flex: 1 },
    scrollContent: { padding: spacing.margin, gap: spacing.lg, paddingBottom: spacing.xl * 6 },
    summaryCardWrap: { gap: spacing.md },
    summaryTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
    summaryLabel: { ...typography.labelSm, color: colors.secondary, textTransform: 'uppercase', fontWeight: '600' },
    summaryBig: { ...typography.currencyDisplay, color: colors.onSurface },
    summaryUnallocated: { ...typography.headlineSm, color: colors.primary, fontWeight: '700' },
    baselineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    baselineInput: {
      ...typography.currencyDisplay,
      color: colors.onSurface,
      borderBottomWidth: 1.5,
      borderBottomColor: colors.primary,
      paddingVertical: 2,
      minWidth: 140,
    },
    progressTrack: { flexDirection: 'row', height: 10, borderRadius: radius.full, backgroundColor: 'rgba(120,120,140,0.18)', overflow: 'hidden' },
    progressSeg: { height: '100%' },
    spentRow: { flexDirection: 'row', justifyContent: 'space-between' },
    spentLabel: { ...typography.bodySm, color: colors.onSurfaceVariant },
    spentValue: { ...typography.bodySm, color: colors.onSurface, fontWeight: '700' },
    closeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      height: 52,
      backgroundColor: colors.inverseSurface,
      borderRadius: radius.lg,
    },
    closeBtnText: { ...typography.labelLg, color: colors.inverseOnSurface, fontWeight: '700' },
    toastWrap: { padding: 0 },
    toastRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
    toastText: { ...typography.bodySm, color: colors.onSurface, flex: 1 },
    bucketCardWrap: {},
    bucketHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
    },
    bucketTitle: { ...typography.labelLg, fontWeight: '700' },
    bucketBody: { padding: spacing.md, gap: spacing.sm },
    emptyHint: { ...typography.bodySm, color: colors.onSurfaceVariant, paddingVertical: spacing.xs },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: glass.chipBackground,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.default,
      height: 46,
    },
    itemLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1, marginRight: spacing.sm },
    itemName: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '600', flexShrink: 1 },
    itemRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    itemAmount: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '700' },
    editorRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
    nameInput: {
      flex: 1,
      height: 46,
      backgroundColor: glass.inputBackground,
      borderWidth: 1,
      borderColor: glass.inputBorder,
      borderRadius: radius.default,
      paddingHorizontal: spacing.md,
      color: colors.onSurface,
    },
    amountWrap: { width: 92, position: 'relative', justifyContent: 'center' },
    rupee: { position: 'absolute', left: 10, zIndex: 1, color: colors.secondary, fontWeight: '600' },
    amountInput: {
      height: 46,
      backgroundColor: glass.inputBackground,
      borderWidth: 1,
      borderColor: glass.inputBorder,
      borderRadius: radius.default,
      paddingLeft: 22,
      paddingRight: spacing.sm,
      color: colors.onSurface,
      fontWeight: '600',
    },
    iconBtn: { width: 46, height: 46, borderRadius: radius.default, alignItems: 'center', justifyContent: 'center' },
    iconBtnGhost: { width: 36, height: 46, alignItems: 'center', justifyContent: 'center' },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: glass.chipBackground,
      paddingVertical: 10,
      borderRadius: radius.default,
    },
    addBtnText: { ...typography.labelLg, color: colors.onSurface },
    privacyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
    privacyText: { ...typography.bodySm, color: colors.onSurfaceVariant },
  });
}
