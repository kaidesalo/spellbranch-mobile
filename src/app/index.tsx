import { Link, Stack } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { CardRow } from "@/components/CardRow";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { StatusMessage } from "@/components/StatusMessage";
import { useCardSearch } from "@/hooks/useCardSearch";
import type { CardSummary } from "@/shared/types";
import { colors } from "@/theme";

/**
 * Search is the home screen. FlatList, not ScrollView + map: Scryfall
 * returns up to 175 cards on a page, and mounting every image at once
 * would stall the JS thread. `keyExtractor` uses the Scryfall id so a
 * recycled row is not paired with the previous card's art.
 */
export default function SearchScreen() {
  const [rawQuery, setRawQuery] = useState("");
  const { state, pending } = useCardSearch(rawQuery);

  const renderItem = useCallback(({ item }: { item: CardSummary }) => <CardRow card={item} />, []);

  return (
    <View style={styles.page}>
      <Stack.Screen
        options={{
          title: "Spellbranch",
          headerRight: () => (
            <Link href="/about" style={styles.about}>
              About
            </Link>
          ),
        }}
      />
      <View style={styles.column}>
        <View style={styles.searchWrap}>
          <TextInput
            testID="search-input"
            value={rawQuery}
            onChangeText={setRawQuery}
            placeholder="Search cards, like ajani"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
            style={styles.input}
            accessibilityLabel="Search cards"
          />
          {rawQuery.length > 0 ? (
            <Pressable accessibilityLabel="Clear search" onPress={() => setRawQuery("")} style={styles.clear}>
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          ) : null}
        </View>

        {state.status === "ready" ? (
          <Text style={styles.count}>
            {state.hasMore ? `Showing ${state.cards.length} of ${state.total}` : `${state.cards.length} cards`}
          </Text>
        ) : null}

        <FlatList
          data={state.status === "ready" ? state.cards : []}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          style={styles.list}
          contentContainerStyle={state.status === "ready" ? styles.listContent : styles.emptyList}
          ListEmptyComponent={<EmptyState status={state.status} query={rawQuery} pending={pending} message={"message" in state ? state.message : undefined} />}
        />
        <DisclaimerFooter />
      </View>
    </View>
  );
}

function keyExtractor(card: CardSummary): string {
  return card.id;
}

function EmptyState({
  status,
  query,
  pending,
  message,
}: {
  status: string;
  query: string;
  pending: boolean;
  message?: string;
}) {
  if (status === "loading" || pending) {
    return <StatusMessage busy title={pending && status !== "loading" ? "Waiting a moment…" : "Searching Scryfall…"} />;
  }
  if (status === "error") {
    return <StatusMessage title="Something went wrong" body={message} />;
  }
  if (status === "no-results") {
    return (
      <StatusMessage
        title="No cards found"
        body={`Nothing on Scryfall matched “${query.trim()}”.`}
      />
    );
  }
  return (
    <StatusMessage
      title="Search for a card"
      body="Try a name like Ajani, or a Scryfall filter like t:dragon. Results update after you pause typing."
    />
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.parchment,
  },
  column: {
    flex: 1,
    width: "100%",
    maxWidth: 720,
  },
  about: {
    color: colors.cream,
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 12,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  clear: {
    paddingVertical: 8,
  },
  clearText: {
    color: colors.branch,
    fontWeight: "700",
  },
  count: {
    color: colors.muted,
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 12,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
  },
});
