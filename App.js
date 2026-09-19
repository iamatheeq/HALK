import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Text, Pressable, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';

import { store } from './store/store';
import { ThemeProvider, useAppTheme } from './theme/ThemeContext';
import { GlassAlertProvider } from './components/GlassAlertProvider';
import { bootstrap, logout } from './store/usersSlice';
import { resetAllUserData } from './store/resetActions';
import { consumeBackgroundLockSuppression } from './services/systemUIGuard';
import SplashScreenView from './screens/SplashScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import CreateAccountScreen from './screens/CreateAccountScreen';
import AccountPickerScreen from './screens/AccountPickerScreen';
import RootNavigator from './navigation/RootNavigator';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Gate() {
  const dispatch = useDispatch();
  const { colors } = useAppTheme();
  const status = useSelector((s) => s.users.status);
  const error = useSelector((s) => s.users.error);
  const [addingAccount, setAddingAccount] = useState(false);
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    dispatch(bootstrap());
  }, [dispatch]);

  useEffect(() => {
    if (status === 'locked') setAddingAccount(false);
  }, [status]);

  // Every return to the app requires unlocking again — a finance app shouldn't stay
  // open just because it was backgrounded rather than fully closed. Picking a photo,
  // sharing a backup, etc. also trigger this transition on Android, so screens that
  // launch those flows call suppressNextBackgroundLock() first to opt out once.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' && statusRef.current === 'unlocked' && !consumeBackgroundLockSuppression()) {
        dispatch(resetAllUserData());
        dispatch(logout());
      }
    });
    return () => sub.remove();
  }, [dispatch]);

  if (status === 'checking') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (status === 'error') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, padding: 24, gap: 16 }}>
        <Text style={{ color: colors.error, textAlign: 'center', fontWeight: '600' }}>Something went wrong starting HALK</Text>
        <Text style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>{error}</Text>
        <Pressable
          onPress={() => dispatch(bootstrap())}
          style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }}
        >
          <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>Try Again</Text>
        </Pressable>
      </View>
    );
  }
  if (status === 'onboarding') {
    return <OnboardingScreen />;
  }
  if (status === 'no_account') {
    return <CreateAccountScreen />;
  }
  if (status === 'locked') {
    if (addingAccount) {
      return <CreateAccountScreen onCancel={() => setAddingAccount(false)} />;
    }
    return <AccountPickerScreen onCreateAccount={() => setAddingAccount(true)} />;
  }
  return <RootNavigator />;
}

function AppShell() {
  const { colors, resolvedScheme } = useAppTheme();
  const navTheme = resolvedScheme === 'dark'
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.surface, card: colors.surface, text: colors.onSurface, border: colors.surfaceContainer, primary: colors.primary } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.surface, card: colors.surface, text: colors.onSurface, border: colors.surfaceContainer, primary: colors.primary } };

  return (
    <SafeAreaProvider>
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.surface} />
      <GlassAlertProvider>
        <NavigationContainer theme={navTheme}>
          <Gate />
        </NavigationContainer>
      </GlassAlertProvider>
    </SafeAreaProvider>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <Provider store={store}>
          {showSplash ? <SplashScreenView onFinish={() => setShowSplash(false)} /> : <AppShell />}
        </Provider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
