import { StyleSheet, Text, View } from "react-native";

import { colors, type PipLetter } from "@/theme";

const SYMBOL = /\{([^}]+)\}/g;

/**
 * `{1}{W}` drawn as circles. We parse the braces ourselves so the app does
 * not ship Wizards' mana font. A cost with no braces (unexpected text) is
 * shown as-is rather than dropped.
 */
export function ManaCost({ cost }: { cost: string | null }) {
  if (!cost) return null;
  const symbols = [...cost.matchAll(SYMBOL)].map((match) => match[1] ?? "");
  if (symbols.length === 0) {
    return <Text style={styles.raw}>{cost}</Text>;
  }
  return (
    <View style={styles.row} accessibilityLabel={`Mana cost ${cost}`}>
      {symbols.map((symbol, index) => {
        const pip = pipColors(symbol);
        return (
          <View
            key={`${symbol}-${index}`}
            style={[styles.pip, { backgroundColor: pip.backgroundColor, borderColor: pip.borderColor }, symbol.length > 1 && styles.wide]}
          >
            <Text style={[styles.pipText, { color: pip.color }]}>{symbol}</Text>
          </View>
        );
      })}
    </View>
  );
}

function pipColors(symbol: string): { backgroundColor: string; color: string; borderColor: string } {
  const letter = symbol.length === 1 ? symbol.toUpperCase() : "";
  if (letter && letter in colors.pip) {
    const pip = colors.pip[letter as PipLetter];
    return { backgroundColor: pip.background, color: pip.text, borderColor: pip.border };
  }
  const colorless = colors.pip.C;
  return { backgroundColor: colorless.background, color: colorless.text, borderColor: colorless.border };
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
  },
  pip: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 4,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  wide: {
    paddingHorizontal: 6,
  },
  pipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  raw: {
    color: colors.ink,
    fontSize: 14,
  },
});
