import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import GlassCard from '../components/GlassCard';
import GlassBackground from '../components/GlassBackground';
import { loadLiabilities, addLiability, removeLiability } from '../store/liabilitiesSlice';
import { useGlassAlert } from '../components/GlassAlertProvider';
import { useAppTheme } from '../theme/ThemeContext';
import { radius, spacing, typography, formatCurrency } from '../theme/theme';

export default function LiabilitiesScreen({ navigation }) {
  const dispatch = useDispatch();
  const { colors, glass } = useAppTheme();
  const styles = createStyles(colors, glass);
  const alert = useGlassAlert();
  const items = useSelector((s) => s.liabilities.items);
  const owedByLiabilityId = useSelector((s) => s.liabilities.owedByLiabilityId);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');

  useFocusEffect(
    useCallback(() => {
      dispatch(loadLiabilities());
    }, [dispatch])
  );

  const submit = () => {
    const value = parseFloat(amount);
    if (!name.trim() || Number.isNaN(value) || value <= 0) {
      alert('Check your entry', 'Enter who/what it’s for and an amount greater than zero.');
      return;
    }
    dispatch(addLiability({ name: name.trim(), reason: reason.trim(), amount: value }));
    setName('');
    setReason('');
    setAmount('');
    setAdding(false);
  };

  const handleDelete = (item) => {
    alert('Remove liability', `Remove "${item.name}" and its linked category?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => dispatch(removeLiability({ id: item.id, categoryId: item.category_id })) },
    ]);
  };

  return (
    <GlassBackground>
      <View style={styles.screen}>
        <ScreenHeader label="Liabilities" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.intro}>
            Track money you owe — e.g. borrowed from a neighbour or friend. Each liability also appears as a category
            in Expense so you can log spending against it.
          </Text>

          {items.length === 0 && !adding && (
            <GlassCard style={styles.emptyCardWrap}>
              <MaterialIcons name="account-balance" size={26} color={colors.secondary} />
              <Text style={styles.emptyText}>No liabilities recorded yet.</Text>
            </GlassCard>
          )}

          {items.map((item) => (
            <GlassCard key={item.id} style={styles.cardWrap} contentStyle={styles.cardContent}>
              <View style={styles.cardIcon}>
                <MaterialIcons name="account-balance" size={20} color={colors.tertiary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{item.name}</Text>
                {!!item.reason && <Text style={styles.cardReason}>{item.reason}</Text>}
                <Text style={styles.cardOwed}>Owed: {formatCurrency(owedByLiabilityId[item.id] ?? item.principal_amount)}</Text>
              </View>
              {(owedByLiabilityId[item.id] ?? item.principal_amount) > 0 && (
                <Pressable style={styles.repayBtn} onPress={() => navigation.navigate('RepayLiability', { liabilityId: item.id })}>
                  <Text style={styles.repayBtnText}>Repay</Text>
                </Pressable>
              )}
              <Pressable onPress={() => handleDelete(item)} hitSlop={8}>
                <MaterialIcons name="delete-outline" size={18} color={colors.error} />
              </Pressable>
            </GlassCard>
          ))}

          {adding ? (
            <GlassCard style={styles.formCardWrap}>
              <Text style={styles.label}>Who / what for</Text>
              <TextInput style={styles.input} placeholder="e.g. Borrowed from neighbour" placeholderTextColor={colors.outline} value={name} onChangeText={setName} autoFocus />
              <Text style={styles.label}>Reason (optional)</Text>
              <TextInput style={styles.input} placeholder="e.g. Emergency medical expense" placeholderTextColor={colors.outline} value={reason} onChangeText={setReason} />
              <Text style={styles.label}>Amount</Text>
              <View style={styles.amountWrap}>
                <Text style={styles.rupee}>₹</Text>
                <TextInput style={styles.amountInput} placeholder="0" placeholderTextColor={colors.outline} keyboardType="numeric" value={amount} onChangeText={setAmount} />
              </View>
              <View style={styles.formActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setAdding(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={submit}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </Pressable>
              </View>
            </GlassCard>
          ) : (
            <Pressable style={styles.addBtn} onPress={() => setAdding(true)}>
              <MaterialIcons name="add-circle" size={18} color={colors.onSurface} />
              <Text style={styles.addBtnText}>Add Liability</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    </GlassBackground>
  );
}

function createStyles(colors, glass) {
  return StyleSheet.create({
    screen: { flex: 1 },
    scrollContent: { padding: spacing.margin, gap: spacing.md, paddingBottom: spacing.xl * 3 },
    intro: { ...typography.bodySm, color: colors.onSurfaceVariant },
    emptyCardWrap: { alignItems: 'center', gap: spacing.sm },
    emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
    cardWrap: {},
    cardContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    cardIcon: { width: 36, height: 36, borderRadius: radius.default, backgroundColor: glass.chipBackground, alignItems: 'center', justifyContent: 'center' },
    cardName: { ...typography.labelLg, color: colors.onSurface },
    cardReason: { ...typography.bodySm, color: colors.onSurfaceVariant },
    cardOwed: { ...typography.bodySm, color: colors.tertiary, fontWeight: '700', marginTop: 2 },
    repayBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.default },
    repayBtnText: { ...typography.labelSm, color: colors.onPrimary, fontWeight: '700' },
    formCardWrap: { gap: spacing.xs },
    label: { ...typography.labelSm, color: colors.secondary, textTransform: 'uppercase', marginTop: spacing.sm },
    input: { height: 46, backgroundColor: glass.inputBackground, borderWidth: 1, borderColor: glass.inputBorder, borderRadius: radius.default, paddingHorizontal: spacing.md, color: colors.onSurface },
    amountWrap: { position: 'relative', justifyContent: 'center' },
    rupee: { position: 'absolute', left: 10, zIndex: 1, color: colors.secondary, fontWeight: '600' },
    amountInput: { height: 46, backgroundColor: glass.inputBackground, borderWidth: 1, borderColor: glass.inputBorder, borderRadius: radius.default, paddingLeft: 22, color: colors.onSurface, fontWeight: '600' },
    formActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    cancelBtn: { flex: 1, height: 46, borderRadius: radius.default, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.chipBackground },
    cancelBtnText: { ...typography.labelLg, color: colors.onSurface },
    saveBtn: { flex: 1, height: 46, borderRadius: radius.default, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    saveBtnText: { ...typography.labelLg, color: colors.onPrimary, fontWeight: '700' },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: glass.chipBackground,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.default,
    },
    addBtnText: { ...typography.labelLg, color: colors.onSurface },
  });
}
