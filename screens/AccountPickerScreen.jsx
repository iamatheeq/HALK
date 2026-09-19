import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { unlockAccount, clearError } from '../store/usersSlice';
import { resetAllUserData } from '../store/resetActions';
import { useBackupImport } from '../hooks/useBackupImport';
import GlassCard from '../components/GlassCard';
import GlassBackground from '../components/GlassBackground';
import { useAppTheme } from '../theme/ThemeContext';
import { radius, spacing, typography } from '../theme/theme';
import Logo from '../components/Logo';
import Avatar from '../components/Avatar';

const ICON = require('../assets/icon.png');

export default function AccountPickerScreen({ onCreateAccount }) {
  const dispatch = useDispatch();
  const { colors, glass } = useAppTheme();
  const styles = createStyles(colors, glass);
  const { users, error } = useSelector((s) => s.users);
  const { importing, importError, handleImport } = useBackupImport();

  const [unlockingId, setUnlockingId] = useState(null);

  const handleUnlock = async (userId) => {
    if (error) dispatch(clearError());
    setUnlockingId(userId);
    const result = await dispatch(unlockAccount(userId));
    setUnlockingId(null);
    if (unlockAccount.fulfilled.match(result)) {
      dispatch(resetAllUserData());
    }
  };

  return (
    <GlassBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Image source={ICON} style={styles.icon} resizeMode="contain" />
          <Logo size={22} showIcon={false} />
          <Text style={styles.heading}>Choose your account</Text>
          <Text style={styles.subtitle}>Unlock with your device PIN, fingerprint, or Face ID.</Text>
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}
        {!!importError && <Text style={styles.errorText}>{importError}</Text>}

        <View style={styles.list}>
          {users.map((u) => (
            <GlassCard key={u.id} noPadding style={styles.userRowWrap}>
              <Pressable style={styles.userRow} onPress={() => handleUnlock(u.id)} disabled={unlockingId === u.id}>
                <Avatar uri={u.avatarUri} name={u.name || u.username} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{u.name || u.username}</Text>
                  <Text style={styles.userSub}>@{u.username}</Text>
                </View>
                {unlockingId === u.id ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <MaterialIcons name="fingerprint" size={22} color={colors.primary} />
                )}
              </Pressable>
            </GlassCard>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.secondaryBtn} onPress={onCreateAccount}>
            <MaterialIcons name="person-add" size={18} color={colors.primary} />
            <Text style={styles.secondaryBtnText}>Add Account</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={handleImport} disabled={importing}>
            {importing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialIcons name="restore" size={18} color={colors.primary} />
            )}
            <Text style={styles.secondaryBtnText}>Restore from Backup</Text>
          </Pressable>
        </View>

        <View style={styles.privacyRow}>
          <MaterialIcons name="shield" size={14} color={colors.primary} />
          <Text style={styles.privacyText}>Protected by your device's own security.</Text>
        </View>
      </SafeAreaView>
    </GlassBackground>
  );
}

function createStyles(colors, glass) {
  return StyleSheet.create({
    safe: { flex: 1, paddingHorizontal: spacing.xl },
    header: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.lg, gap: 6 },
    icon: { width: 56, height: 56, marginBottom: spacing.sm },
    heading: { ...typography.headlineSm, color: colors.onSurface, marginTop: spacing.sm },
    subtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center' },
    errorText: { ...typography.bodySm, color: colors.error, textAlign: 'center', marginBottom: spacing.sm },
    list: { gap: spacing.sm, marginTop: spacing.md },
    userRowWrap: {},
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
    },
    userName: { ...typography.labelLg, color: colors.onSurface },
    userSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
    actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
    secondaryBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: glass.chipBackground,
      borderRadius: radius.default,
      paddingVertical: spacing.sm + 2,
    },
    secondaryBtnText: { ...typography.labelSm, color: colors.primary, fontWeight: '600' },
    privacyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      position: 'absolute',
      bottom: spacing.xl,
      alignSelf: 'center',
    },
    privacyText: { ...typography.bodySm, color: colors.onSurfaceVariant },
  });
}
