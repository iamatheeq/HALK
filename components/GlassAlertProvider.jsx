import React, { createContext, useCallback, useContext, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '../theme/ThemeContext';
import { radius, spacing, typography } from '../theme/theme';

const GlassAlertContext = createContext(null);

/**
 * App-wide replacement for the native Alert.alert — renders a blurred glass
 * dialog matching the rest of the UI instead of the OS's flat system alert.
 * Call signature intentionally mirrors Alert.alert(title, message, buttons)
 * so screens can swap one for the other with minimal changes.
 */
export function GlassAlertProvider({ children }) {
  const { colors, glass } = useAppTheme();
  const [config, setConfig] = useState(null);
  const styles = createStyles(colors, glass);

  const showAlert = useCallback((title, message, buttons) => {
    const list = buttons && buttons.length ? buttons : [{ text: 'OK' }];
    setConfig({ title, message, buttons: list });
  }, []);

  const close = () => setConfig(null);

  const handlePress = (btn) => {
    close();
    btn.onPress?.();
  };

  return (
    <GlassAlertContext.Provider value={showAlert}>
      {children}
      <Modal visible={!!config} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          <View style={styles.cardShadow}>
            <BlurView intensity={glass.intensity} tint={glass.tint} style={styles.blur}>
              <View style={[styles.cardInner, { backgroundColor: glass.backgroundStrong, borderColor: glass.border }]}>
                {!!config?.title && <Text style={styles.title}>{config.title}</Text>}
                {!!config?.message && <Text style={styles.message}>{config.message}</Text>}
                <View style={styles.buttonRow}>
                  {config?.buttons.map((btn, i) => (
                    <Pressable
                      key={i}
                      style={[
                        styles.button,
                        btn.style === 'destructive' && { backgroundColor: colors.error },
                        btn.style === 'cancel' && styles.buttonCancel,
                        !btn.style && { backgroundColor: colors.primary },
                      ]}
                      onPress={() => handlePress(btn)}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          btn.style === 'destructive' && { color: colors.onError ?? '#fff' },
                          btn.style === 'cancel' && { color: colors.onSurface },
                          !btn.style && { color: colors.onPrimary },
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </BlurView>
          </View>
        </View>
      </Modal>
    </GlassAlertContext.Provider>
  );
}

export function useGlassAlert() {
  const ctx = useContext(GlassAlertContext);
  if (!ctx) throw new Error('useGlassAlert must be used within a GlassAlertProvider');
  return ctx;
}

function createStyles(colors, glass) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.45)',
      paddingHorizontal: spacing.xl,
    },
    cardShadow: {
      width: '100%',
      maxWidth: 360,
      borderRadius: radius.lg,
      shadowColor: glass.shadowColor,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 12,
    },
    blur: {
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    cardInner: {
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: spacing.lg,
      gap: spacing.xs,
    },
    title: { ...typography.headlineSm, color: colors.onSurface },
    message: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 2 },
    buttonRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    button: {
      flex: 1,
      height: 46,
      borderRadius: radius.default,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    buttonCancel: { backgroundColor: 'rgba(255,255,255,0.2)' },
    buttonText: { ...typography.labelLg, fontWeight: '700' },
  });
}
