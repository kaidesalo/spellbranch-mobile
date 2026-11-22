import { Stack } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { FAN_CONTENT_DISCLAIMER, FAN_CONTENT_POLICY_URL, SCRYFALL_CREDIT, SCRYFALL_HOME } from "@/legal";
import { colors } from "@/theme";

/**
 * The full Fan Content Policy sentence lives here, verbatim. The search
 * screen only has room for the short form. Spellbranch is free: this
 * screen is the whole "account" story, which is that there isn't one.
 */
export default function AboutScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: "About" }} />
      <View style={styles.column}>
        <Text style={styles.heading}>Spellbranch</Text>
        <Text style={styles.body}>
          Spellbranch is a free card lookup for the table. Search Scryfall, open a card, and flip a double-faced card
          from the front face to the back. There is no account, no paywall, and no advertising.
        </Text>

        <View style={styles.notice} testID="about-disclaimer">
          <Text style={styles.noticeLabel}>Fan Content Policy</Text>
          <Text style={styles.noticeBody}>{FAN_CONTENT_DISCLAIMER}</Text>
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(FAN_CONTENT_POLICY_URL)}>
            <Text style={styles.link}>Read the Fan Content Policy</Text>
          </Pressable>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeLabel}>Card data</Text>
          <Text style={styles.noticeBody}>{SCRYFALL_CREDIT} Scryfall is not affiliated with Wizards of the Coast.</Text>
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(SCRYFALL_HOME)}>
            <Text style={styles.link}>scryfall.com</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    alignItems: "center",
    backgroundColor: colors.parchment,
    paddingVertical: 24,
  },
  column: {
    width: "100%",
    maxWidth: 720,
    paddingHorizontal: 16,
    gap: 16,
  },
  heading: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "700",
  },
  body: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 24,
  },
  notice: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 8,
  },
  noticeLabel: {
    color: colors.branchDark,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  noticeBody: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 24,
  },
  link: {
    color: colors.branch,
    fontSize: 16,
    fontWeight: "700",
  },
});
