import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { FaceToggle } from "@/components/FaceToggle";
import { ManaCost } from "@/components/ManaCost";
import { StatusMessage } from "@/components/StatusMessage";
import { useCardDetail } from "@/hooks/useCardDetail";
import type { LegalityRow } from "@/shared/types";
import { colors } from "@/theme";

/**
 * `/card/[id]` — the brackets are the route param, read with
 * `useLocalSearchParams`. The face index is local state: Scryfall already
 * sent every face in one response, so flipping does not fetch again.
 */
export default function CardDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : undefined;
  // Remount when the id changes so the face toggle starts on the front.
  // Remembering "back" across two different cards would show the wrong face.
  return <CardBody key={id ?? "missing"} id={id} />;
}

function CardBody({ id }: { id: string | undefined }) {
  const { state, reload } = useCardDetail(id);
  const [faceIndex, setFaceIndex] = useState(0);

  if (state.status === "loading") {
    return (
      <View style={styles.page}>
        <Stack.Screen options={{ title: "Card" }} />
        <StatusMessage busy title="Loading card…" />
      </View>
    );
  }

  if (state.status === "invalid") {
    return (
      <View style={styles.page}>
        <Stack.Screen options={{ title: "Card" }} />
        <StatusMessage title="That card link is not valid." body="Search for the card by name instead." />
      </View>
    );
  }

  if (state.status === "not-found") {
    return (
      <View style={styles.page}>
        <Stack.Screen options={{ title: "Card" }} />
        <StatusMessage title="Scryfall does not have that card." />
      </View>
    );
  }

  if (state.status === "error") {
    return (
      <View style={styles.page}>
        <Stack.Screen options={{ title: "Card" }} />
        <StatusMessage title="Something went wrong" body={state.message} actionLabel="Try again" onAction={reload} />
      </View>
    );
  }

  const card = state.card;
  const face = card.faces[Math.min(faceIndex, card.faces.length - 1)] ?? card.faces[0];
  if (!face) {
    return (
      <View style={styles.page}>
        <StatusMessage title="Scryfall sent an unexpected answer." />
      </View>
    );
  }
  const artist = face.artist;
  const scryfallUri = card.scryfallUri;
  const setLine = [card.setName, card.collectorNumber].filter(Boolean).join(" · ");

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Stack.Screen options={{ title: face.name }} />
      <View style={styles.column}>
        <FaceToggle faces={card.faces} index={faceIndex} onChange={setFaceIndex} />
        {face.imageUri ? (
          <Image
            source={{ uri: face.imageUri }}
            style={styles.art}
            contentFit="contain"
            accessibilityLabel={face.name}
          />
        ) : (
          <View style={[styles.art, styles.missing]}>
            <Text style={styles.missingText}>No art</Text>
          </View>
        )}
        {artist ? <Text style={styles.artist}>Illustrated by {artist}</Text> : null}
        <Text style={styles.name}>{face.name}</Text>
        <ManaCost cost={face.manaCost} />
        {face.typeLine ? <Text style={styles.typeLine}>{face.typeLine}</Text> : null}
        {face.oracleText ? <Text style={styles.oracle}>{face.oracleText}</Text> : null}
        {setLine ? <Text style={styles.set}>{setLine}</Text> : null}
        <Legalities rows={card.legalities} />
        {scryfallUri ? (
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(scryfallUri)} style={styles.scryfall}>
            <Text style={styles.scryfallText}>View on Scryfall</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

function Legalities({ rows }: { rows: LegalityRow[] }) {
  if (rows.length === 0) return null;
  const groups = groupByStatus(rows);
  return (
    <View style={styles.legal}>
      <Text style={styles.legalHeading}>Legalities</Text>
      {groups.map((group) => (
        <View key={group.status} style={styles.legalGroup}>
          <Text style={[styles.legalStatus, statusColor(group.status)]}>{group.label}</Text>
          <Text style={styles.legalFormats}>{group.formats}</Text>
        </View>
      ))}
    </View>
  );
}

function groupByStatus(rows: LegalityRow[]): { status: string; label: string; formats: string }[] {
  const order: string[] = [];
  const buckets = new Map<string, { label: string; formats: string[] }>();
  for (const row of rows) {
    const existing = buckets.get(row.status);
    if (existing) {
      existing.formats.push(row.label);
    } else {
      order.push(row.status);
      buckets.set(row.status, { label: row.statusLabel, formats: [row.label] });
    }
  }
  return order.map((status) => {
    const bucket = buckets.get(status)!;
    return { status, label: bucket.label, formats: bucket.formats.join(", ") };
  });
}

function statusColor(status: string) {
  if (status === "legal") return { color: colors.branch };
  if (status === "banned") return { color: colors.danger };
  if (status === "restricted") return { color: colors.warning };
  return { color: colors.muted };
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.parchment,
    justifyContent: "center",
  },
  scroll: {
    alignItems: "center",
    paddingVertical: 16,
    backgroundColor: colors.parchment,
  },
  column: {
    width: "100%",
    maxWidth: 720,
    paddingHorizontal: 16,
    gap: 12,
  },
  art: {
    width: "100%",
    maxWidth: 320,
    aspectRatio: 63 / 88,
    alignSelf: "center",
    borderRadius: 12,
    backgroundColor: colors.parchmentDeep,
  },
  missing: {
    alignItems: "center",
    justifyContent: "center",
  },
  missingText: {
    color: colors.muted,
  },
  artist: {
    textAlign: "center",
    color: colors.muted,
    fontSize: 14,
  },
  name: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "700",
  },
  typeLine: {
    color: colors.ink,
    fontSize: 16,
  },
  oracle: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 24,
  },
  set: {
    color: colors.muted,
    fontSize: 14,
  },
  legal: {
    gap: 8,
    paddingTop: 4,
  },
  legalHeading: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "700",
  },
  legalGroup: {
    gap: 2,
  },
  legalStatus: {
    fontSize: 14,
    fontWeight: "700",
  },
  legalFormats: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  scryfall: {
    alignSelf: "flex-start",
    backgroundColor: colors.branchDark,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 24,
  },
  scryfallText: {
    color: colors.cream,
    fontWeight: "700",
  },
});
