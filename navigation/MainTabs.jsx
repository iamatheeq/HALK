import React from "react";
import {
  StyleSheet,
  View,
  Platform,
} from "react-native";

import {
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";

import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import { useAppTheme } from "../theme/ThemeContext";

import DashboardScreen from "../screens/DashboardScreen";
import BudgetAllocationScreen from "../screens/BudgetAllocationScreen";
import LiabilitiesScreen from "../screens/LiabilitiesScreen";
import SavingsScreen from "../screens/SavingsScreen";
import MoreScreen from "../screens/MoreScreen";
import FAB from "../components/FAB";

const Tab = createBottomTabNavigator();

// Keep the bottom bar to 5 tabs max for a comfortable, uncluttered thumb reach —
// anything past that (Reports, Settings, and future additions) lives behind "More".
const ICONS = {
  Dashboard: "dashboard",
  Builder: "tune",
  Liabilities: "account-balance",
  Savings: "account-balance-wallet",
  More: "more-horiz",
};

/**
 * Convert HEX color to rgba().
 * This allows the glass effect to use
 * your existing theme colors.
 */
function hexToRgba(hex, opacity) {
  const cleanHex = hex.replace("#", "");

  const bigint = parseInt(cleanHex, 16);

  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export default function MainTabs({ navigation }) {
  const {
    colors,
    resolvedScheme,
  } = useAppTheme();

  const isDark = resolvedScheme === "dark";

  /**
   * -----------------------------------------
   * GLASS COLORS
   * -----------------------------------------
   */

  const glassBackground = isDark
    ? hexToRgba(colors.surfaceContainerHigh, 0.78)
    : hexToRgba(colors.surfaceContainerLow, 0.78);

  const glassOverlay = isDark
    ? hexToRgba(colors.surfaceContainer, 0.42)
    : hexToRgba(colors.surfaceBright, 0.42);

  const glassBorder = isDark
    ? hexToRgba(colors.outlineVariant, 0.65)
    : hexToRgba(colors.outlineVariant, 0.8);

  const inactiveColor = isDark
    ? hexToRgba(colors.onSurfaceVariant, 0.75)
    : hexToRgba(colors.onSurfaceVariant, 0.7);

  return (
    <View style={styles.container}>
      <Tab.Navigator
        initialRouteName="Dashboard"

        screenOptions={({ route }) => ({
          headerShown: false,

          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.onSurfaceVariant,

          /**
           * ======================================
           * GLASS BACKGROUND
           * ======================================
           */

          tabBarBackground: () => (
            <View style={StyleSheet.absoluteFill}>
              <BlurView
                intensity={isDark ? 85 : 70}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />

              {/* Main glass */}
              <View
                style={[
                  StyleSheet.absoluteFill,
                  styles.glassLayer,
                  {
                    backgroundColor:
                      glassBackground,
                  },
                ]}
              />

              {/* Glass highlight */}
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor:
                      glassOverlay,

                    borderColor:
                      glassBorder,

                    borderWidth: 1,
                  },
                ]}
              />
            </View>
          ),

          /**
           * ======================================
           * FLOATING TAB BAR
           * ======================================
           */

          tabBarStyle: {
            position: "absolute",

            left: 14,
            right: 14,

            bottom: 10,

            height: 76,

            paddingTop: 6,

            paddingBottom:
              Platform.OS === "ios"
                ? 12
                : 8,

            borderRadius: 28,

            borderTopWidth: 0,

            backgroundColor:
              "transparent",

            elevation: 0,

            shadowColor:
              colors.onBackground,

            shadowOffset: {
              width: 0,
              height: 8,
            },

            shadowOpacity:
              isDark
                ? 0.35
                : 0.14,

            shadowRadius: 18,
          },

          tabBarItemStyle: {
            paddingVertical: 2,
          },

          /**
           * ======================================
           * TAB LABEL
           * ======================================
           */

          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "600",
            marginTop: 1,
          },

          /**
           * ======================================
           * ICON
           * ======================================
           */

          tabBarIcon: ({
            focused,
            size,
          }) => {
            const isDashboard =
              route.name === "Dashboard";

            /**
             * Dashboard icon is larger
             */
            const iconSize =
              isDashboard
                ? focused
                  ? 34
                  : 31
                : size ?? 21;

            /**
             * Dashboard
             */
            if (isDashboard) {
              return (
                <View
                  style={[
                    styles.dashboardIcon,

                    {
                      backgroundColor:
                        focused
                          ? colors.primary
                          : hexToRgba(
                              colors.surfaceContainerHighest,
                              0.95
                            ),

                      borderColor:
                        focused
                          ? hexToRgba(
                              colors.onPrimary,
                              0.9
                            )
                          : glassBorder,

                      shadowColor:
                        colors.primary,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={ICONS[route.name]}
                    size={iconSize}
                    color={
                      focused
                        ? colors.onPrimary
                        : colors.onSurface
                    }
                  />

                  {/* Glass reflection */}
                  <View
                    pointerEvents="none"
                    style={[
                      styles.dashboardHighlight,
                      {
                        backgroundColor:
                          hexToRgba(
                            colors.onPrimary,
                            isDark
                              ? 0.16
                              : 0.2
                          ),
                      },
                    ]}
                  />
                </View>
              );
            }

            /**
             * Normal tabs
             */
            return (
              <View
                style={[
                  styles.normalIcon,

                  focused && {
                    backgroundColor:
                      hexToRgba(
                        colors.primary,
                        0.1
                      ),
                  },
                ]}
              >
                <MaterialIcons
                  name={ICONS[route.name]}
                  size={iconSize}
                  color={
                    focused
                      ? colors.primary
                      : inactiveColor
                  }
                />
              </View>
            );
          },
        })}
      >
        {/* LEFT */}
        <Tab.Screen
          name="Builder"
          component={BudgetAllocationScreen}
        />

        <Tab.Screen
          name="Liabilities"
          component={LiabilitiesScreen}
        />

        {/* CENTER + OPENING PAGE */}
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
        />

        {/* RIGHT */}
        <Tab.Screen
          name="Savings"
          component={SavingsScreen}
        />

        <Tab.Screen
          name="More"
          component={MoreScreen}
        />
      </Tab.Navigator>

      {/* Floating Add Expense */}
      <FAB
        onPress={() =>
          navigation.navigate("AddExpense")
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /**
   * Glass layer
   */
  glassLayer: {
    borderRadius: 28,
  },

  /**
   * Dashboard floating button
   */
  dashboardIcon: {
    position: "relative",

    width: 62,
    height: 62,

    borderRadius: 31,

    alignItems: "center",
    justifyContent: "center",

    marginTop: -22,

    borderWidth: 2,

    shadowOffset: {
      width: 0,
      height: 7,
    },

    shadowOpacity: 0.32,

    shadowRadius: 14,

    elevation: 10,

    overflow: "hidden",
  },

  /**
   * Small glass reflection
   */
  dashboardHighlight: {
    position: "absolute",

    top: 3,

    left: 9,

    right: 9,

    height: 12,

    borderRadius: 10,
  },

  /**
   * Other tab icons
   */
  normalIcon: {
    width: 40,
    height: 34,

    borderRadius: 17,

    alignItems: "center",
    justifyContent: "center",

    marginBottom: 1,
  },
});