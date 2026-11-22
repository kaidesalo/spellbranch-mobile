import "react-native-gesture-handler";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { colors } from "@/theme";

/**
 * Expo Router treats every file in `src/app` as a route. This layout is the
 * stack those screens sit in: search at `/`, a card at `/card/[id]`, and
 * About at `/about`. Shared code lives in `src/shared`, outside `src/app`,
 * so it is not turned into a screen.
 *
 * The gesture-handler import is first because the stack's swipe-back
 * gesture has to be installed before any screen renders.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.branchDark },
          headerTintColor: colors.cream,
          headerTitleStyle: { fontWeight: "600" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.parchment },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Spellbranch" }} />
        <Stack.Screen name="about" options={{ title: "About" }} />
        <Stack.Screen name="card/[id]" options={{ title: "Card" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
