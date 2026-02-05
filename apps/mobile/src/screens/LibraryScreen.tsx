import { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { ResizeMode, Video } from "expo-av";
import { PrimaryButton } from "../components/PrimaryButton";
import { listSwings } from "../lib/api";
import type { SwingListItem } from "@swing/shared";

const NUM_COLUMNS = 3;
const GRID_GAP = 8;
const HORIZONTAL_PADDING = 20;

export function LibraryScreen({ navigation }: { navigation: any }) {
  const [swings, setSwings] = useState<SwingListItem[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const containerWidth = width || 360;
  const itemSize = Math.floor(
    (containerWidth -
      HORIZONTAL_PADDING * 2 -
      GRID_GAP * (NUM_COLUMNS - 1)) /
      NUM_COLUMNS
  );

  const loadSwings = async () => {
    setStatus("loading");
    setError(null);

    try {
      const response = await listSwings();
      setSwings(response.items);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to load swings.");
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadSwings);
    loadSwings();
    return unsubscribe;
  }, [navigation]);

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>Your Swing Library</Text>
      <Text style={styles.subtitle}>
        Browse your swings and review the latest uploads.
      </Text>
      <Text style={styles.sectionTitle}>Your Swings</Text>
      {status === "loading" ? (
        <Text style={styles.cardBody}>Loading swings...</Text>
      ) : null}
      {status === "error" ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}
    </View>
  );

  const emptyState =
    status === "idle" ? <Text style={styles.cardBody}>No swings yet.</Text> : null;

  return (
    <FlatList
      data={swings}
      keyExtractor={(item) => item.id}
      numColumns={NUM_COLUMNS}
      contentContainerStyle={styles.container}
      ListHeaderComponent={header}
      ListEmptyComponent={emptyState}
      columnWrapperStyle={styles.gridRow}
      ListFooterComponent={
        <View style={styles.footer}>
          <PrimaryButton
            label="Upload Swing"
            onPress={() => navigation.navigate("Upload")}
          />
        </View>
      }
      renderItem={({ item, index }) => {
        const marginRight = (index + 1) % NUM_COLUMNS === 0 ? 0 : GRID_GAP;
        return (
          <Pressable
            onPress={() => navigation.navigate("SwingDetail", { swing: item })}
            style={[
              styles.gridItem,
              {
                width: itemSize,
                height: itemSize,
                marginRight
              }
            ]}
          >
            {item.previewUrl ? (
              <Video
                source={{ uri: item.previewUrl }}
                style={styles.gridVideo}
                resizeMode={ResizeMode.COVER}
                isMuted
                shouldPlay={false}
              />
            ) : (
              <View style={styles.previewFallback}>
                <Text style={styles.previewFallbackText}>
                  Preview unavailable
                </Text>
              </View>
            )}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 20,
    paddingBottom: 32
  },
  header: {
    gap: 8,
    marginBottom: 12
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F1A17"
  },
  subtitle: {
    fontSize: 16,
    color: "#3C4A46"
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600"
  },
  cardBody: {
    color: "#4A5B55"
  },
  cardHint: {
    color: "#5B6B66",
    fontSize: 13
  },
  previewFallback: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1
  },
  previewFallbackText: {
    color: "#5B6B66"
  },
  gridItem: {
    backgroundColor: "#DDE3E0",
    borderRadius: 8,
    overflow: "hidden"
  },
  gridRow: {
    marginBottom: GRID_GAP
  },
  gridVideo: {
    height: "100%",
    width: "100%"
  },
  footer: {
    paddingTop: 16
  },
  error: {
    color: "#9A2B2B",
    fontWeight: "600"
  }
});
