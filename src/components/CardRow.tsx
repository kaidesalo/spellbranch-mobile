import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ManaCost } from "@/components/ManaCost";
import type { CardSummary } from "@/shared/types";
import { colors } from "@/theme";

/**
 * One search hit. The art is Scryfall's `small` (see mapCardSummary): a list
 * can hold a whole page of cards, and `normal` is several times larger.
 * Width 56 keeps the 63:88 card ratio without dominating the name.
 */
export function CardRow({ card }: { card: CardSummary }) {
  return (
    // Link defaults to a Text wrapper. asChild lets the Pressable be the
    // row, which is the only way a View (the art and the mana pips) is valid.
    <Link href={{ pathname: "/card/[id]", params: { id: card.id } }} asChild>
      <Pressable style={styles.row} accessibilityRole="button" accessibilityLabel={card.name}>
        {card.imageUri ? (
          <Image
            source={{ uri: card.imageUri }}
            style={styles.art}
            contentFit="cover"
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        ) : (
          <View style={[styles.art, styles.missing]}>
            <Text style={styles.missingText}>No art</Text>
          </View>
        )}
        <View style={styles.copy}>
          <Text style={styles.name} numberOfLines={2}>
            {card.name}
          </Text>
          <ManaCost cost={card.manaCost} />
          {card.faceCount > 1 ? <Text style={styles.faces}>{card.faceCount} faces</Text> : null}
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  art: {
    width: 56,
    height: 78,
    borderRadius: 4,
    backgroundColor: colors.parchmentDeep,
  },
  missing: {
    alignItems: "center",
    justifyContent: "center",
  },
  missingText: {
    color: colors.muted,
    fontSize: 11,
  },
  copy: {
    flex: 1,
    gap: 6,
  },
  name: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "600",
  },
  faces: {
    color: colors.muted,
    fontSize: 12,
  },
});
