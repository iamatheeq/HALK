import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import ScreenHeader from '../components/ScreenHeader';
import GlassCard from '../components/GlassCard';
import GlassBackground from '../components/GlassBackground';
import { useGlassAlert } from '../components/GlassAlertProvider';
import { deleteAccount, logout, clearError } from '../store/usersSlice';
import { resetAllUserData } from '../store/resetActions';
import { saveBackupToDevice } from '../services/backupService';
import { useAppTheme } from '../theme/ThemeContext';
import { radius, spacing, typography } from '../theme/theme';
import Avatar from '../components/Avatar';

const THEME_OPTIONS = [
  { key: 'system', label: 'System', icon: 'brightness-auto' },
  { key: 'light', label: 'Light', icon: 'light-mode' },
  { key: 'dark', label: 'Dark', icon: 'dark-mode' },
];

function Row({ icon, title, subtitle, right, onPress, danger, colors, glass }) {
  const styles = createStyles(colors, glass);
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper style={styles.row} onPress={onPress}>
      <View style={[styles.rowIcon, danger && { backgroundColor: colors.errorContainer }]}>
        <MaterialIcons name={icon} size={18} color={danger ? colors.error : colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, danger && { color: colors.error }]}>{title}</Text>
        {!!subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      {right}
    </Wrapper>
  );
}

export default function SettingsScreen({ navigation }) {
  const dispatch = useDispatch();
  const { colors, glass, mode, setMode } = useAppTheme();
  const styles = createStyles(colors, glass);
  const activeUser = useSelector((s) => s.users.activeUser);
  const users = useSelector((s) => s.users.users);
  const alert = useGlassAlert();

  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleLogout = () => {
    dispatch(resetAllUserData());
    dispatch(logout());
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await saveBackupToDevice(activeUser.id, activeUser.username);
      alert('Backup saved', 'Your backup file was saved to the folder you chose.');
    } catch (e) {
      alert('Download failed', e.message || 'Could not save the backup file.');
    }
    setDownloading(false);
  };

  const handleDeleteAccount = () => {
    alert(
      'Delete this account?',
      `This permanently deletes "${activeUser?.name || activeUser?.username}" and all its budget data. This can’t be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const result = await dispatch(deleteAccount(activeUser.id));
            setDeleting(false);
            if (deleteAccount.fulfilled.match(result)) {
              dispatch(resetAllUserData());
            } else {
              alert('Could not delete account', result.payload || 'Try again.');
              dispatch(clearError());
            }
          },
        },
      ]
    );
  };

  return (
    <GlassBackground>
      <View style={styles.screen}>
        <ScreenHeader label="Settings" onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <GlassCard noPadding style={styles.cardWrap}>
            <Pressable style={styles.profileRow} onPress={() => navigation.navigate('EditProfile')}>
              <Avatar uri={activeUser?.avatarUri} name={activeUser?.name || activeUser?.username} size={52} />
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{activeUser?.name || activeUser?.username}</Text>
                <Text style={styles.profileSub}>@{activeUser?.username}</Text>
                {!!activeUser?.mobile && <Text style={styles.profileSub}>{activeUser.mobile}</Text>}
              </View>
              <MaterialIcons name="edit" size={18} color={colors.secondary} />
            </Pressable>
          </GlassCard>

          <Text style={styles.sectionTitle}>Account</Text>
          <GlassCard noPadding style={styles.cardWrap}>
            <Row
              icon="logout"
              title="Log Out"
              subtitle={`${users.length} account${users.length === 1 ? '' : 's'} on this device`}
              onPress={handleLogout}
              right={<MaterialIcons name="chevron-right" size={20} color={colors.secondary} />}
              colors={colors}
              glass={glass}
            />
            {Platform.OS === 'android' && (
              <Row
                icon="save-alt"
                title="Download Backup"
                subtitle="Save the backup file straight to a folder on this device"
                onPress={handleDownload}
                right={downloading ? <ActivityIndicator size="small" color={colors.primary} /> : <MaterialIcons name="chevron-right" size={20} color={colors.secondary} />}
                colors={colors}
                glass={glass}
              />
            )}
          </GlassCard>

          <Text style={styles.sectionTitle}>Appearance</Text>
          <GlassCard noPadding style={styles.cardWrap}>
            <View style={styles.themeRow}>
              {THEME_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  style={[styles.themeChip, mode === opt.key && styles.themeChipActive]}
                  onPress={() => setMode(opt.key)}
                >
                  <MaterialIcons name={opt.icon} size={18} color={mode === opt.key ? colors.onPrimary : colors.onSurfaceVariant} />
                  <Text style={[styles.themeChipText, mode === opt.key && styles.themeChipTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          </GlassCard>

          <Text style={styles.sectionTitle}>About</Text>
          <GlassCard noPadding style={styles.cardWrap}>
            <Row icon="info" title="HALK" subtitle="Household Allocation & Liability Kernel · v1.0" colors={colors} glass={glass} />
            <Row icon="security" title="Unlocks with your device's own security" subtitle="System PIN, pattern, fingerprint, or Face ID" colors={colors} glass={glass} />
            <Row icon="favorite" title="Powered by mugavai.co" colors={colors} glass={glass} />
            <Row icon="code" title="Developed by Atheequrrahman" colors={colors} glass={glass} />
          </GlassCard>

          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <GlassCard noPadding style={styles.cardWrap}>
            <Row
              icon="person-remove"
              title="Delete This Account"
              subtitle="Removes this account and its data only"
              onPress={deleting ? undefined : handleDeleteAccount}
              right={deleting ? <ActivityIndicator size="small" color={colors.error} /> : null}
              danger
              colors={colors}
              glass={glass}
            />
          </GlassCard>
        </ScrollView>
      </View>
    </GlassBackground>
  );
}

function createStyles(colors, glass) {
  return StyleSheet.create({
    screen: { flex: 1 },
    scrollContent: { padding: spacing.margin, paddingBottom: spacing.xl * 3, gap: spacing.xs },
    sectionTitle: { ...typography.labelSm, color: colors.secondary, textTransform: 'uppercase', marginTop: spacing.lg, marginBottom: spacing.xs },
    cardWrap: { overflow: 'hidden' },
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
    profileName: { ...typography.headlineSm, color: colors.onSurface },
    profileSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: glass.border },
    rowIcon: { width: 32, height: 32, borderRadius: radius.default, backgroundColor: glass.chipBackground, alignItems: 'center', justifyContent: 'center' },
    rowTitle: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '600' },
    rowSubtitle: { ...typography.bodySm, color: colors.onSurfaceVariant },
    themeRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
    themeChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm, borderRadius: radius.default, backgroundColor: glass.chipBackground },
    themeChipActive: { backgroundColor: colors.primary },
    themeChipText: { ...typography.labelSm, color: colors.onSurfaceVariant },
    themeChipTextActive: { color: colors.onPrimary, fontWeight: '700' },
  });
}
