import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { useAppTheme } from '../theme/ThemeContext';
import { radius, spacing, typography } from '../theme/theme';
import { completeOnboarding } from '../store/usersSlice';
import GlassCard from '../components/GlassCard';
import GlassBackground from '../components/GlassBackground';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: 'account-balance-wallet',
    title: 'Budget your household, your way',
    body: 'Split income into must-pay bills, flexible spending, and savings goals — fully custom, no forced templates.',
  },
  {
    icon: 'shield',
    title: 'Your data never leaves this device',
    body: 'HALK stores everything locally in an encrypted on-device database. No account, no cloud sync, no tracking.',
  },
  {
    icon: 'gavel',
    title: 'Terms & Privacy',
    body: 'By continuing you agree to use HALK for personal household budgeting. All data stays on your device and is your responsibility to back up.',
  },
];

export default function OnboardingScreen() {
  const dispatch = useDispatch();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const scrollRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [agreed, setAgreed] = useState(false);

  const isLast = index === SLIDES.length - 1;

  const goTo = (i) => {
    scrollRef.current?.scrollTo({ x: i * width, animated: true });
    setIndex(i);
  };

  const onScrollEnd = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(i);
  };

  const finish = () => {
    dispatch(completeOnboarding());
  };

  return (
    <GlassBackground>
    <View style={styles.screen}>
      <View style={styles.skipRow}>
        {!isLast && (
          <Pressable onPress={finish} hitSlop={8}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
      >
        {SLIDES.map((slide) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <GlassCard strong noPadding style={styles.iconWrapCard} contentStyle={styles.iconWrapContent}>
              <MaterialIcons name={slide.icon} size={40} color={colors.primary} />
            </GlassCard>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      {isLast ? (
        <View style={styles.bottomBlock}>
          <Pressable style={styles.agreeRow} onPress={() => setAgreed((a) => !a)}>
            <MaterialIcons
              name={agreed ? 'check-box' : 'check-box-outline-blank'}
              size={22}
              color={agreed ? colors.primary : colors.outline}
            />
            <Text style={styles.agreeText}>I agree to the Terms of Use and Privacy Policy</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryBtn, !agreed && styles.primaryBtnDisabled]}
            onPress={finish}
            disabled={!agreed}
          >
            <Text style={styles.primaryBtnText}>Continue</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.bottomBlock}>
          <Pressable style={styles.primaryBtn} onPress={() => goTo(index + 1)}>
            <Text style={styles.primaryBtnText}>Next</Text>
            <MaterialIcons name="arrow-forward" size={18} color={colors.onPrimary} />
          </Pressable>
        </View>
      )}
    </View>
    </GlassBackground>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1 },
    skipRow: { alignItems: 'flex-end', paddingHorizontal: spacing.lg, paddingTop: spacing.xl, height: 60 },
    skipText: { ...typography.labelLg, color: colors.secondary },
    slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },
    iconWrapCard: { width: 88, height: 88, marginBottom: spacing.sm },
    iconWrapContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    title: { ...typography.headlineLg, color: colors.onSurface, textAlign: 'center' },
    body: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center' },
    dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.md },
    dot: { width: 7, height: 7, borderRadius: radius.full, backgroundColor: colors.outlineVariant },
    dotActive: { backgroundColor: colors.primary, width: 20 },
    bottomBlock: { paddingHorizontal: spacing.xl, paddingVertical: spacing.xl, gap: spacing.md },
    agreeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    agreeText: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1 },
    primaryBtn: {
      height: 52,
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    primaryBtnDisabled: { opacity: 0.4 },
    primaryBtnText: { ...typography.labelLg, color: colors.onPrimary, fontWeight: '700' },
  });
}
