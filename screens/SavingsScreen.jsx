import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import GlassCard from '../components/GlassCard';
import GlassBackground from '../components/GlassBackground';
import { useGlassAlert } from '../components/GlassAlertProvider';
import { loadSavings, addSavingsGoal, removeSavingsGoal, depositToSavings } from '../store/savingsSlice';
import { loadCategories, loadMonthlyBaseline, loadCycleSavingsDeposits, selectRemainingAllocatable } from '../store/budgetSlice';
import { useAppTheme } from '../theme/ThemeContext';
import { radius, spacing, typography, formatCurrency } from '../theme/theme';

function DepositRow({ goal, remainingAllocatable, onDeposit, colors, glass }) {
  const styles = createStyles(colors, glass);
  const alert = useGlassAlert();
  const [depositing, setDepositing] = useState(false);
  const [amount, setAmount] = useState('');

  const submit = () => {
    const value = parseFloat(amount);
    if (Number.isNaN(value) || value <= 0) {
      alert('Enter an amount', 'Enter an amount greater than zero.');
      return;
    }
    if (value > remainingAllocatable) {
      alert('Not enough unallocated money', `Only ${formatCurrency(remainingAllocatable)} is unallocated right now.`);
      return;
    }
    onDeposit(value);
    setAmount('');
    setDepositing(false);
  };

  if (depositing) {
    return (
      <View style={styles.depositRow}>
        <View style={styles.amountWrap}>
          <Text style={styles.rupee}>₹</Text>
          <TextInput
            style={styles.amountInput}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.outline}
            value={amount}
            onChangeText={setAmount}
            autoFocus
          />
        </View>
        <Pressable style={[styles.iconBtn, { backgroundColor: colors.primary }]} onPress={submit}>
          <MaterialIcons name="check" size={18} color={colors.onPrimary} />
        </Pressable>
        <Pressable style={styles.iconBtnGhost} onPress={() => { setDepositing(false); setAmount(''); }}>
          <MaterialIcons name="close" size={18} color={colors.secondary} />
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable style={styles.depositBtn} onPress={() => setDepositing(true)}>
      <MaterialIcons name="add" size={16} color={colors.primary} />
      <Text style={styles.depositBtnText}>Add Money</Text>
    </Pressable>
  );
}

export default function SavingsScreen() {
  const dispatch = useDispatch();
  const { colors, glass } = useAppTheme();
  const styles = createStyles(colors, glass);
  const goals = useSelector((s) => s.savings.goals);
  const total = useSelector((s) => s.savings.total);
  const remainingAllocatable = useSelector(selectRemainingAllocatable);
  const alert = useGlassAlert();

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  useFocusEffect(
    useCallback(() => {
      dispatch(loadSavings());
      dispatch(loadCategories());
      dispatch(loadMonthlyBaseline());
      dispatch(loadCycleSavingsDeposits());
    }, [dispatch])
  );

  const submitNewGoal = () => {
    if (!name.trim()) {
      alert('Name your goal', 'Give this savings goal a name.');
      return;
    }
    dispatch(addSavingsGoal({ name: name.trim(), amount: 0 }));
    setName('');
    setAdding(false);
  };

  const handleDeposit = (goalId) => async (amount) => {
    await dispatch(depositToSavings({ id: goalId, amount }));
    // Refresh the cycle-scoped deposit counter so the Unallocated cap reflects this
    // deposit immediately — otherwise a second deposit in the same visit could exceed
    // what's actually still unallocated this cycle.
    dispatch(loadCycleSavingsDeposits());
  };

  const handleDelete = (goal) => {
    alert('Remove this goal?', `Remove "${goal.name}"? Its ${formatCurrency(goal.amount)} balance will no longer be tracked.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => dispatch(removeSavingsGoal(goal.id)) },
    ]);
  };

  return (
    <GlassBackground>
      <View style={styles.screen}>
        <ScreenHeader label="Savings" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <GlassCard strong style={styles.totalCardWrap}>
            <Text style={styles.totalLabel}>Total Savings</Text>
            <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
            <Text style={styles.totalHint}>Grows automatically when you close a budget cycle, or add money manually below.</Text>
          </GlassCard>

          {goals.map((goal) => (
            <GlassCard key={goal.id} style={styles.goalCardWrap}>
              <View style={styles.goalHeaderRow}>
                <View style={styles.goalIcon}>
                  <MaterialIcons name={goal.is_default ? 'account-balance-wallet' : 'flag'} size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.goalName}>{goal.name}</Text>
                  {!!goal.is_default && <Text style={styles.goalDefault}>Default — receives Close Budget carry-over</Text>}
                </View>
                <Text style={styles.goalAmount}>{formatCurrency(goal.amount)}</Text>
                {!goal.is_default && (
                  <Pressable onPress={() => handleDelete(goal)} hitSlop={8} style={{ marginLeft: spacing.xs }}>
                    <MaterialIcons name="delete-outline" size={18} color={colors.error} />
                  </Pressable>
                )}
              </View>
              <DepositRow goal={goal} remainingAllocatable={remainingAllocatable} onDeposit={handleDeposit(goal.id)} colors={colors} glass={glass} />
            </GlassCard>
          ))}

          {adding ? (
            <GlassCard style={styles.formCardWrap}>
              <Text style={styles.label}>Goal Name</Text>
              <TextInput
                style={styles.nameInput}
                placeholder="e.g. New Laptop"
                placeholderTextColor={colors.outline}
                value={name}
                onChangeText={setName}
                autoFocus
              />
              <View style={styles.formActions}>
                <Pressable style={styles.cancelBtn} onPress={() => { setAdding(false); setName(''); }}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={submitNewGoal}>
                  <Text style={styles.saveBtnText}>Create Goal</Text>
                </Pressable>
              </View>
            </GlassCard>
          ) : (
            <Pressable style={styles.addGoalBtn} onPress={() => setAdding(true)}>
              <MaterialIcons name="add-circle" size={18} color={colors.onSurface} />
              <Text style={styles.addGoalBtnText}>Add Savings Goal</Text>
            </Pressable>
          )}

          <View style={styles.privacyRow}>
            <MaterialIcons name="lock" size={16} color={colors.primary} />
            <Text style={styles.privacyText}>Savings is tracked separately from your budget — it never resets.</Text>
          </View>
        </ScrollView>
      </View>
    </GlassBackground>
  );
}

function createStyles(colors, glass) {
  return StyleSheet.create({
    screen: { flex: 1 },
    scrollContent: { padding: spacing.margin, gap: spacing.md, paddingBottom: spacing.xl * 6 },
    totalCardWrap: { alignItems: 'center', gap: 4 },
    totalLabel: { ...typography.labelSm, color: colors.secondary, textTransform: 'uppercase' },
    totalValue: { ...typography.currencyDisplay, color: colors.primary },
    totalHint: { ...typography.bodySm, color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 },
    goalCardWrap: { gap: spacing.sm },
    goalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    goalIcon: { width: 32, height: 32, borderRadius: radius.default, backgroundColor: glass.chipBackground, alignItems: 'center', justifyContent: 'center' },
    goalName: { ...typography.labelLg, color: colors.onSurface },
    goalDefault: { ...typography.labelSm, color: colors.onSurfaceVariant },
    goalAmount: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '700' },
    depositBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      backgroundColor: glass.chipBackground,
      paddingVertical: 8,
      borderRadius: radius.default,
    },
    depositBtnText: { ...typography.labelSm, color: colors.primary, fontWeight: '700' },
    depositRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
    amountWrap: { flex: 1, position: 'relative', justifyContent: 'center' },
    rupee: { position: 'absolute', left: 10, zIndex: 1, color: colors.secondary, fontWeight: '600' },
    amountInput: {
      height: 46,
      backgroundColor: glass.inputBackground,
      borderWidth: 1,
      borderColor: glass.inputBorder,
      borderRadius: radius.default,
      paddingLeft: 22,
      color: colors.onSurface,
      fontWeight: '600',
    },
    iconBtn: { width: 46, height: 46, borderRadius: radius.default, alignItems: 'center', justifyContent: 'center' },
    iconBtnGhost: { width: 36, height: 46, alignItems: 'center', justifyContent: 'center' },
    formCardWrap: { gap: spacing.xs },
    label: { ...typography.labelSm, color: colors.secondary, textTransform: 'uppercase', marginTop: spacing.xs },
    nameInput: { height: 46, backgroundColor: glass.inputBackground, borderWidth: 1, borderColor: glass.inputBorder, borderRadius: radius.default, paddingHorizontal: spacing.md, color: colors.onSurface },
    formActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    cancelBtn: { flex: 1, height: 46, borderRadius: radius.default, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.chipBackground },
    cancelBtnText: { ...typography.labelLg, color: colors.onSurface },
    saveBtn: { flex: 1, height: 46, borderRadius: radius.default, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    saveBtnText: { ...typography.labelLg, color: colors.onPrimary, fontWeight: '700' },
    addGoalBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: glass.chipBackground,
      paddingVertical: 12,
      borderRadius: radius.lg,
    },
    addGoalBtnText: { ...typography.labelLg, color: colors.onSurface },
    privacyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
    privacyText: { ...typography.bodySm, color: colors.onSurfaceVariant },
  });
}
