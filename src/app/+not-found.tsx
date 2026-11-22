import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme";

/** Expo Router renders this for any path that is not a file in `src/app`. */
export default function NotFoundScreen() {
  return (
    <View style={styles.page}>
      <Stack.Screen options={{ title: "Not found" }} />
      <Text style={styles.title}>That screen is not in the app.</Text>
      <Link href="/" style={styles.link}>
        Back to search
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    backgroundColor: colors.parchment,
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  link: {
    color: colors.branch,
    fontSize: 16,
    fontWeight: "700",
  },
});
