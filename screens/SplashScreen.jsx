import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';
import { typography } from '../theme/theme';

const ICON = require('../assets/icon.png');

export default function SplashScreen({ onFinish }) {
  const { colors } = useAppTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => onFinish?.());
    }, 1600);
    return () => clearTimeout(timer);
  }, [opacity, onFinish]);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Animated.View style={[styles.content, { opacity }]}>
        <Image source={ICON} style={styles.icon} resizeMode="contain" />
      </Animated.View>
      <Animated.View style={[styles.creditBlock, { opacity }]}>
        <Text style={[styles.credit, { color: colors.outline }]}>Powered by mugavai.co</Text>
        <Text style={[styles.credit, { color: colors.outline }]}>Developed by Atheequrrahman</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center' },
  icon: { width: 112, height: 112 },
  creditBlock: { position: 'absolute', bottom: 40, alignItems: 'center', gap: 4 },
  credit: { ...typography.labelSm },
});
