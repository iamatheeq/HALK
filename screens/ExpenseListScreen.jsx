import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { loadTransactions, removeTransaction } from '../store/transactionsSlice';
import GlassCard from '../components/GlassCard';
import GlassBackground from '../components/GlassBackground';
import { useAppTheme } from '../theme/ThemeContext';
import { radius, spacing, typography, formatCurrency } from '../theme/theme';

const MODES = ['Day', 'Week', 'Month', 'Year', 'Range'];

function pad(n) {
  return String(n).padStart(2, '0');
}
function iso(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function startOfWeek(d) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday start
  const res = new Date(d);
  res.setDate(d.getDate() + diff);
  return res;
}
function addDays(d, n) {
  const res = new Date(d);
  res.setDate(d.getDate() + n);
  return res;
}
function addMonths(d, n) {
  const res = new Date(d);
  res.setMonth(d.getMonth() + n);
  return res;
}
function addYears(d, n) {
  const res = new Date(d);
  res.setFullYear(d.getFullYear() + n);
  return res;
}

function getRange(mode, anchor) {
  if (mode === 'Day') return { from: iso(anchor), to: iso(anchor), label: anchor.toDateString() };
  if (mode === 'Week') {
    const start = startOfWeek(anchor);
    const end = addDays(start, 6);
    return { from: iso(start), to: iso(end), label: `${start.toDateString()} – ${end.toDateString()}` };
  }
  if (mode === 'Month') {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    return { from: iso(start), to: iso(end), label: start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) };
  }
  if (mode === 'Year') {
    const start = new Date(anchor.getFullYear(), 0, 1);
    const end = new Date(anchor.getFullYear(), 11, 31);
    return { from: iso(start), to: iso(end), label: String(anchor.getFullYear()) };
  }
  return null;
}

function shiftAnchor(mode, anchor, dir) {
  if (mode === 'Day') return addDays(anchor, dir);
  if (mode === 'Week') return addDays(anchor, dir * 7);
  if (mode === 'Month') return addMonths(anchor, dir);
  if (mode === 'Year') return addYears(anchor, dir);
  return anchor;
}

export default function ExpenseListScreen() {
  const dispatch = useDispatch();
  const { colors, glass } = useAppTheme();
  const styles = createStyles(colors, glass);
  const items = useSelector((s) => s.transactions.items);

  const [mode, setMode] = useState('Month');
  const [anchor, setAnchor] = useState(new Date());
  const [rangeStart, setRangeStart] = useState(addDays(new Date(), -6));
  const [rangeEnd, setRangeEnd] = useState(new Date());
  const [pickerTarget, setPickerTarget] = useState(null); // 'start' | 'end' | null

  const range = mode === 'Range' ? { from: iso(rangeStart), to: iso(rangeEnd), label: `${rangeStart.toDateString()} – ${rangeEnd.toDateString()}` } : getRange(mode, anchor);

  useFocusEffect(
    useCallback(() => {
      if (range) dispatch(loadTransactions({ from: range.from, to: range.to }));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, range?.from, range?.to])
  );

  const total = useMemo(() => items.reduce((sum, t) => sum + (t.type === 'expense' ? t.amount : 0), 0), [items]);

  const handleDelete = (item) => {
    dispatch(removeTransaction({ id: item.id }));
  };

  return (
    <GlassBackground>
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>All Expenses</Text>
      </View>

      <View style={styles.modeRow}>
        {MODES.map((m) => (
          <Pressable key={m} style={[styles.modeChip, mode === m && styles.modeChipActive]} onPress={() => setMode(m)}>
            <Text style={[styles.modeChipText, mode === m && styles.modeChipTextActive]}>{m}</Text>
          </Pressable>
        ))}
      </View>

      {mode === 'Range' ? (
        <View style={styles.rangeRow}>
          <Pressable style={styles.rangeBtn} onPress={() => setPickerTarget('start')}>
            <MaterialIcons name="event" size={16} color={colors.primary} />
            <Text style={styles.rangeBtnText}>{iso(rangeStart)}</Text>
          </Pressable>
          <Text style={styles.rangeSep}>to</Text>
          <Pressable style={styles.rangeBtn} onPress={() => setPickerTarget('end')}>
            <MaterialIcons name="event" size={16} color={colors.primary} />
            <Text style={styles.rangeBtnText}>{iso(rangeEnd)}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.navRow}>
          <Pressable onPress={() => setAnchor((a) => shiftAnchor(mode, a, -1))} hitSlop={8}>
            <MaterialIcons name="chevron-left" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.navLabel}>{range?.label}</Text>
          <Pressable onPress={() => setAnchor((a) => shiftAnchor(mode, a, 1))} hitSlop={8}>
            <MaterialIcons name="chevron-right" size={24} color={colors.onSurface} />
          </Pressable>
        </View>
      )}

      {pickerTarget && (
        <DateTimePicker
          value={pickerTarget === 'start' ? rangeStart : rangeEnd}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, selected) => {
            setPickerTarget(null);
            if (selected) {
              if (pickerTarget === 'start') setRangeStart(selected);
              else setRangeEnd(selected);
            }
          }}
        />
      )}

      <GlassCard style={styles.totalRowWrap} contentStyle={styles.totalRowContent}>
        <Text style={styles.totalLabel}>Total spent</Text>
        <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
      </GlassCard>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No expenses in this period.</Text>}
        renderItem={({ item }) => (
          <GlassCard style={styles.rowWrap} contentStyle={styles.rowContent}>
            <View style={styles.rowIcon}>
              <MaterialIcons name={item.category_icon || 'receipt-long'} size={18} color={colors.primary} />
            </View>
            <View style={styles.rowMain}>
              <Text style={styles.rowName}>{item.category_name || 'Uncategorized'}</Text>
              <Text style={styles.rowMeta}>{item.date}{item.note ? ` • ${item.note}` : ''}</Text>
            </View>
            <Text style={styles.rowAmount}>{formatCurrency(item.amount)}</Text>
            <Pressable onPress={() => handleDelete(item)} hitSlop={8} style={{ marginLeft: spacing.sm }}>
              <MaterialIcons name="delete-outline" size={18} color={colors.error} />
            </Pressable>
          </GlassCard>
        )}
      />
    </SafeAreaView>
    </GlassBackground>
  );
}

function createStyles(colors, glass) {
  return StyleSheet.create({
    screen: { flex: 1 },
    headerRow: { paddingHorizontal: spacing.margin, paddingTop: spacing.sm, paddingBottom: spacing.xs },
    headerTitle: { ...typography.headlineLg, color: colors.onSurface },
    modeRow: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.margin, paddingVertical: spacing.sm },
    modeChip: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.full, backgroundColor: glass.chipBackground },
    modeChipActive: { backgroundColor: colors.inverseSurface },
    modeChipText: { ...typography.labelSm, color: colors.onSurfaceVariant },
    modeChipTextActive: { color: colors.inverseOnSurface, fontWeight: '700' },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.margin,
      paddingVertical: spacing.sm,
    },
    navLabel: { ...typography.labelLg, color: colors.onSurface },
    rangeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.margin, paddingVertical: spacing.sm },
    rangeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: glass.chipBackground, paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.default },
    rangeBtnText: { ...typography.labelSm, color: colors.onSurface },
    rangeSep: { ...typography.labelSm, color: colors.onSurfaceVariant },
    totalRowWrap: { marginHorizontal: spacing.margin, marginBottom: spacing.sm },
    totalRowContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { ...typography.labelSm, color: colors.secondary, textTransform: 'uppercase' },
    totalValue: { ...typography.headlineSm, color: colors.onSurface, fontWeight: '700' },
    listContent: { paddingHorizontal: spacing.margin, paddingBottom: spacing.xl * 2, gap: spacing.xs },
    emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.xl },
    rowWrap: { marginBottom: spacing.xs },
    rowContent: { flexDirection: 'row', alignItems: 'center' },
    rowIcon: { width: 32, height: 32, borderRadius: radius.default, backgroundColor: glass.chipBackground, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
    rowMain: { flex: 1 },
    rowName: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '600' },
    rowMeta: { ...typography.labelSm, color: colors.onSurfaceVariant },
    rowAmount: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '700' },
  });
}
