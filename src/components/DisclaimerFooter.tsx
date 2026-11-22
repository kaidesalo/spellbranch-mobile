import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FAN_CONTENT_SHORT, SCRYFALL_CREDIT } from "@/legal";
import { colors } from "@/theme";

/**
 * The short policy notice stays on screen while the list scrolls, so a
 * screenshot of search still shows it. The full sentence lives on About.
 * The bottom inset keeps the text above the home indicator.
 */
export function DisclaimerFooter() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <Text style={styles.text}>{FAN_CONTENT_SHORT}</Text>
      <Text style={styles.text}>{SCRYFALL_CREDIT}</Text>
      <Link href="/about" style={styles.link}>
        Full disclaimer
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.parchmentDeep,
    paddingTop: 10,
    paddingHorizontal: 16,
    gap: 2,
  },
  text: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  link: {
    color: colors.branch,
    fontSize: 13,
    fontWeight: "600",
    paddingVertical: 4,
  },
});
