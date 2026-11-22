import { Pressable, StyleSheet, Text, View } from "react-native";

import type { CardFaceView } from "@/shared/types";
import { colors } from "@/theme";

/**
 * Double-faced cards are one Scryfall object with `card_faces`. The toggle
 * only changes which face we render. Legalities stay put: Scryfall stores
 * one legality map for the whole card.
 *
 * Two faces are labeled Front and Back, which is what transform and modal
 * cards are. More than two (a five-part split) uses the face names, because
 * "back" would not say which part you are on.
 */
export function FaceToggle({
  faces,
  index,
  onChange,
}: {
  faces: CardFaceView[];
  index: number;
  onChange: (next: number) => void;
}) {
  if (faces.length < 2) return null;
  const pair = faces.length === 2;
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {faces.map((face, faceIndex) => {
        const selected = faceIndex === index;
        const label = pair ? (faceIndex === 0 ? "Front" : "Back") : face.name;
        return (
          <Pressable
            key={`${face.name}-${faceIndex}`}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={pair ? `${label}: ${face.name}` : face.name}
            testID={pair ? (faceIndex === 0 ? "face-front" : "face-back") : `face-${faceIndex}`}
            onPress={() => onChange(faceIndex)}
            style={[styles.tab, selected && styles.tabOn]}
          >
            <Text style={[styles.label, selected && styles.labelOn]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.branch,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    backgroundColor: colors.card,
  },
  tabOn: {
    backgroundColor: colors.branch,
  },
  label: {
    color: colors.branch,
    fontSize: 15,
    fontWeight: "700",
  },
  labelOn: {
    color: colors.cream,
  },
});
