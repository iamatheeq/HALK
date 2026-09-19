import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { createAccount, clearError } from '../store/usersSlice';
import { resetAllUserData } from '../store/resetActions';
import { useBackupImport } from '../hooks/useBackupImport';
import GlassCard from '../components/GlassCard';
import GlassBackground from '../components/GlassBackground';
import { useAppTheme } from '../theme/ThemeContext';
import { radius, spacing, typography } from '../theme/theme';
import Logo from '../components/Logo';
import Avatar from '../components/Avatar';

function isValidUsername(u) {
  return /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/.test(u.trim());
}

function isValidMobile(m) {
  return /^\d{10}$/.test(m.trim());
}

export default function CreateAccountScreen({ onCancel }) {
  const dispatch = useDispatch();
  const { colors, glass } = useAppTheme();
  const styles = createStyles(colors, glass);
  const error = useSelector((s) => s.users.error);
  const { importing, importError, handleImport } = useBackupImport();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (fieldError) setFieldError('');
    if (error) dispatch(clearError());
    if (!isValidUsername(username)) {
      setFieldError('Username must be 3-20 characters, start with a letter, and use only letters, numbers, or underscores.');
      return;
    }
    if (mobile.trim() && !isValidMobile(mobile)) {
      setFieldError('Mobile number must be exactly 10 digits, or leave it blank.');
      return;
    }
    setSubmitting(true);
    const result = await dispatch(createAccount({ name, username: username.trim(), mobile }));
    setSubmitting(false);
    if (createAccount.fulfilled.match(result)) {
      dispatch(resetAllUserData());
    } else {
      const payload = result.payload;
      setFieldError((typeof payload === 'string' ? payload : payload?.message) || 'Could not create account.');
    }
  };

  return (
    <GlassBackground>
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {onCancel && (
            <Pressable style={styles.cancelBtn} onPress={onCancel} hitSlop={8}>
              <MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} />
            </Pressable>
          )}

          <View style={styles.header}>
            <Logo size={22} />
            <Text style={styles.heading}>Create your account</Text>
            <Text style={styles.subtitle}>Only a username is required. Unlocking uses your device's own PIN or biometrics.</Text>
          </View>

          <View style={styles.avatarPicker}>
            <Avatar name={name || username} size={72} />
          </View>

          {!!fieldError && <Text style={styles.errorText}>{fieldError}</Text>}
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          {!!importError && <Text style={styles.errorText}>{importError}</Text>}

          <GlassCard style={styles.form}>
            <Text style={styles.label}>Username *</Text>
            <TextInput
              style={styles.input}
              placeholder="Choose a username"
              placeholderTextColor={colors.outline}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              value={username}
              onChangeText={setUsername}
            />
            <Text style={styles.label}>Display Name (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name (optional)"
              placeholderTextColor={colors.outline}
              value={name}
              onChangeText={setName}
            />
            <Text style={styles.label}>Mobile Number (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              placeholderTextColor={colors.outline}
              keyboardType="number-pad"
              maxLength={10}
              value={mobile}
              onChangeText={setMobile}
            />

            <Pressable style={styles.continueBtn} onPress={submit} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <>
                  <Text style={styles.continueBtnText}>Create Account</Text>
                  <MaterialIcons name="arrow-forward" size={18} color={colors.onPrimary} />
                </>
              )}
            </Pressable>
          </GlassCard>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable style={styles.restoreBtn} onPress={handleImport} disabled={importing}>
            {importing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <MaterialIcons name="restore" size={18} color={colors.primary} />
                <Text style={styles.restoreBtnText}>Restore from Backup</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </GlassBackground>
  );
}

function createStyles(colors, glass) {
  return StyleSheet.create({
    safe: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl },
    cancelBtn: { alignSelf: 'flex-end' },
    header: { alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.md, gap: 6 },
    heading: { ...typography.headlineSm, color: colors.onSurface, marginTop: spacing.sm },
    subtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center' },
    avatarPicker: { alignSelf: 'center', marginBottom: spacing.lg },
    errorText: { ...typography.bodySm, color: colors.error, textAlign: 'center', marginBottom: spacing.sm },
    form: { gap: spacing.xs },
    label: { ...typography.labelSm, color: colors.secondary, textTransform: 'uppercase', marginTop: spacing.sm },
    input: {
      height: 50,
      backgroundColor: glass.inputBackground,
      borderWidth: 1,
      borderColor: glass.inputBorder,
      borderRadius: radius.default,
      paddingHorizontal: spacing.md,
      color: colors.onSurface,
      ...typography.bodyLg,
    },
    continueBtn: {
      height: 52,
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      marginTop: spacing.xl,
    },
    continueBtnText: { ...typography.labelLg, color: colors.onPrimary, fontWeight: '700' },
    dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
    dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: glass.border },
    dividerText: { ...typography.labelSm, color: colors.onSurfaceVariant },
    restoreBtn: {
      height: 50,
      backgroundColor: glass.chipBackground,
      borderRadius: radius.default,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: spacing.md,
    },
    restoreBtnText: { ...typography.labelSm, color: colors.primary, fontWeight: '600' },
  });
}
