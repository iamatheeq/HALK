import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import GlassCard from '../components/GlassCard';
import GlassBackground from '../components/GlassBackground';
import { useGlassAlert } from '../components/GlassAlertProvider';
import { loadTransactions } from '../store/transactionsSlice';
import { exportSummaryToPdf, saveHistoryCsvToDevice } from '../services/exportService';
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
  const diff = (day === 0 ? -6 : 1) - day;
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

export default function ReportsScreen({ navigation }) {
  const dispatch = useDispatch();
  const { colors, glass } = useAppTheme();
  const styles = createStyles(colors, glass);
  const alert = useGlassAlert();
  const items = useSelector((s) => s.transactions.items);
  const categories = useSelector((s) => s.budget.categories);

  const [mode, setMode] = useState('Month');
  const [anchor, setAnchor] = useState(new Date());
  const [rangeStart, setRangeStart] = useState(addDays(new Date(), -29));
  const [rangeEnd, setRangeEnd] = useState(new Date());
  const [pickerTarget, setPickerTarget] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  const range = mode === 'Range' ? { from: iso(rangeStart), to: iso(rangeEnd), label: `${rangeStart.toDateString()} – ${rangeEnd.toDateString()}` } : getRange(mode, anchor);

  useFocusEffect(
    useCallback(() => {
      if (range) dispatch(loadTransactions({ from: range.from, to: range.to }));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, range?.from, range?.to])
  );

  const byCategory = useMemo(() => {
    const map = {};
    items.forEach((t) => {
      if (t.type !== 'expense') return;
      const key = t.category_name || 'Uncategorized';
      map[key] = (map[key] || 0) + t.amount;
    });
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [items]);

  const total = byCategory.reduce((s, c) => s + c.amount, 0);

  const handlePdf = async () => {
    setExportingPdf(true);
    try {
      await exportSummaryToPdf({
        title: 'HALK Report',
        subtitle: `${range?.label ?? ''} — expense breakdown`,
        snapshots: [{ month_year: range?.from ?? '', total_income: 0, total_expenses: total, rollover_amount: 0 }],
        categories,
      });
    } catch (e) {
      alert('Export failed', e.message || 'Could not generate the PDF report.');
    }
    setExportingPdf(false);
  };

  const csvRows = () =>
    items.map((t) => ({
      month_year: t.date,
      total_income: t.type === 'income' ? t.amount : 0,
      total_expenses: t.type === 'expense' ? t.amount : 0,
      rollover_amount: 0,
      rollover_target: t.category_name || '',
    }));

  const handleDownloadCsv = async () => {
    if (items.length === 0) {
      alert('Nothing to export', 'No expenses in this period yet.');
      return;
    }
    setDownloadingCsv(true);
    try {
      await saveHistoryCsvToDevice(csvRows());
      alert('CSV saved', 'Your CSV file was saved to the folder you chose.');
    } catch (e) {
      alert('Download failed', e.message || 'Could not save the CSV file.');
    }
    setDownloadingCsv(false);
  };

  return (
    <GlassBackground>
      <View style={styles.screen}>
        <ScreenHeader label="Reports" onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
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

        <GlassCard style={styles.totalCardWrap}>
          <Text style={styles.totalLabel}>Total Spent</Text>
          <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
        </GlassCard>

        <GlassCard style={styles.breakdownCardWrap}>
          <Text style={styles.breakdownTitle}>By Category</Text>
          {byCategory.length === 0 ? (
            <Text style={styles.emptyText}>No expenses in this period.</Text>
          ) : (
            byCategory.map((c) => (
              <View key={c.name} style={styles.categoryRow}>
                <View style={styles.categoryTopRow}>
                  <Text style={styles.categoryName}>{c.name}</Text>
                  <Text style={styles.categoryAmount}>{formatCurrency(c.amount)}</Text>
                </View>
                <View style={styles.categoryTrack}>
                  <View style={[styles.categoryFill, { width: `${total ? (c.amount / total) * 100 : 0}%` }]} />
                </View>
              </View>
            ))
          )}
        </GlassCard>

        <View style={styles.exportBlock}>
          <Pressable style={styles.pdfBtn} onPress={handlePdf} disabled={exportingPdf}>
            {exportingPdf ? (
              <ActivityIndicator size="small" color={colors.inverseOnSurface} />
            ) : (
              <>
                <MaterialIcons name="picture-as-pdf" size={20} color={colors.inverseOnSurface} />
                <Text style={styles.pdfBtnText}>Download Report (PDF)</Text>
              </>
            )}
          </Pressable>
          {Platform.OS === 'android' && (
            <Pressable style={styles.csvBtn} onPress={handleDownloadCsv} disabled={downloadingCsv}>
              {downloadingCsv ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <MaterialIcons name="save-alt" size={20} color={colors.primary} />
                  <Text style={styles.csvBtnText}>Download CSV</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
        </ScrollView>
      </View>
    </GlassBackground>
  );
}

function createStyles(colors, glass) {
  return StyleSheet.create({
    screen: { flex: 1 },
    scrollContent: { padding: spacing.margin, gap: spacing.md, paddingBottom: spacing.xl * 3 },
    modeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    modeChip: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.full, backgroundColor: glass.chipBackground },
    modeChipActive: { backgroundColor: colors.inverseSurface },
    modeChipText: { ...typography.labelSm, color: colors.onSurfaceVariant },
    modeChipTextActive: { color: colors.inverseOnSurface, fontWeight: '700' },
    navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    navLabel: { ...typography.labelLg, color: colors.onSurface },
    rangeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    rangeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: glass.chipBackground, paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.default },
    rangeBtnText: { ...typography.labelSm, color: colors.onSurface },
    rangeSep: { ...typography.labelSm, color: colors.onSurfaceVariant },
    totalCardWrap: { gap: 4 },
    totalLabel: { ...typography.labelSm, color: colors.secondary, textTransform: 'uppercase' },
    totalValue: { ...typography.currencyDisplay, color: colors.onSurface },
    breakdownCardWrap: { gap: spacing.sm },
    breakdownTitle: { ...typography.headlineSm, color: colors.onSurface, marginBottom: spacing.xs },
    emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
    categoryRow: { gap: 4 },
    categoryTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
    categoryName: { ...typography.bodyMd, color: colors.onSurface },
    categoryAmount: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '700' },
    categoryTrack: { height: 6, borderRadius: radius.full, backgroundColor: colors.surfaceContainer, overflow: 'hidden' },
    categoryFill: { height: '100%', backgroundColor: colors.primary },
    exportBlock: { gap: spacing.sm },
    pdfBtn: { height: 48, backgroundColor: colors.inverseSurface, borderRadius: radius.default, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
    pdfBtnText: { ...typography.labelLg, color: colors.inverseOnSurface, fontWeight: '600' },
    csvBtn: { height: 48, backgroundColor: colors.surfaceContainer, borderRadius: radius.default, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
    csvBtnText: { ...typography.labelLg, color: colors.onSurface, fontWeight: '600' },
  });
}
