import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile } from '../store/usersSlice';
import GlassCard from '../components/GlassCard';
import GlassBackground from '../components/GlassBackground';
import { useAppTheme } from '../theme/ThemeContext';
import { radius, spacing, typography } from '../theme/theme';
import Avatar from '../components/Avatar';

function isValidMobile(m) {
  return /^\d{10}$/.test(m.trim());
}

export default function EditProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const { colors, glass } = useAppTheme();
  const styles = createStyles(colors, glass);
  const activeUser = useSelector((s) => s.users.activeUser);

  const [name, setName] = useState(activeUser?.name || '');
  const [mobile, setMobile] = useState(activeUser?.mobile || '');
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState('');

  const save = async () => {
    if (mobile.trim() && !isValidMobile(mobile)) {
      setFieldError('Mobile number must be exactly 10 digits, or leave it blank.');
      return;
    }
    setFieldError('');
    setSaving(true);
    await dispatch(updateProfile({ userId: activeUser.id, name, mobile }));
    setSaving(false);
    navigation.goBack();
  };

  return (
    <GlassBackground>
      <SafeAreaView style={styles.screen}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Edit Profile</Text>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.avatarPicker}>
            <Avatar name={name || activeUser?.username} size={84} />
          </View>

          {!!fieldError && <Text style={styles.errorText}>{fieldError}</Text>}

          <GlassCard style={styles.formCardWrap}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyText}>@{activeUser?.username}</Text>
            </View>

            <Text style={styles.label}>Display Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.outline} />

            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              style={styles.input}
              value={mobile}
              onChangeText={setMobile}
              placeholder="10-digit mobile number"
              placeholderTextColor={colors.outline}
              keyboardType="number-pad"
              maxLength={10}
            />
          </GlassCard>

          <Pressable style={styles.saveBtn} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </GlassBackground>
  );
}

function createStyles(colors, glass) {
  return StyleSheet.create({
    screen: { flex: 1 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    title: { ...typography.headlineSm, color: colors.onSurface },
    content: { padding: spacing.lg, gap: spacing.xs },
    avatarPicker: { alignSelf: 'center', marginBottom: spacing.lg },
    errorText: { ...typography.bodySm, color: colors.error, textAlign: 'center', marginBottom: spacing.sm },
    formCardWrap: { gap: spacing.xs },
    label: { ...typography.labelSm, color: colors.secondary, textTransform: 'uppercase', marginTop: spacing.md },
    readonlyField: { height: 50, backgroundColor: glass.chipBackground, borderRadius: radius.default, paddingHorizontal: spacing.md, justifyContent: 'center' },
    readonlyText: { ...typography.bodyLg, color: colors.onSurfaceVariant },
    input: { height: 50, backgroundColor: glass.inputBackground, borderWidth: 1, borderColor: glass.inputBorder, borderRadius: radius.default, paddingHorizontal: spacing.md, color: colors.onSurface, ...typography.bodyLg },
    saveBtn: { height: 52, backgroundColor: colors.primary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
    saveBtnText: { ...typography.labelLg, color: colors.onPrimary, fontWeight: '700' },
  });
}
