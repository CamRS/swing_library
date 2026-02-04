import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { listSwings } from "../lib/api";
import type { Swing } from "@swing/shared";

export function LibraryScreen({ navigation }: { navigation: any }) {
  const [swings, setSwings] = useState<Swing[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Your Swing Library</Text>
      <Text style={styles.subtitle}>
        Browse your swings and shared libraries. Start by uploading a new swing.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Swings</Text>
        {status === "loading" ? (
          <Text style={styles.cardBody}>Loading swings...</Text>
        ) : null}
        {status === "error" ? (
          <Text style={styles.error}>{error}</Text>
        ) : null}
        {status === "idle" && swings.length === 0 ? (
          <Text style={styles.cardBody}>No swings yet.</Text>
        ) : null}
        {swings.map((swing) => (
          <View key={swing.id} style={styles.row}>
            <Text style={styles.cardBody}>Swing {swing.id.slice(0, 6)}</Text>
            <Text style={styles.cardHint}>
              {new Date(swing.createdAt).toLocaleDateString()}
            </Text>
          </View>
        ))}
      </View>

      <PrimaryButton label="Upload Swing" onPress={() => navigation.navigate("Upload")} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16
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
  card: {
    backgroundColor: "#F4F6F5",
    borderRadius: 12,
    padding: 16
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6
  },
  cardBody: {
    color: "#4A5B55"
  },
  cardHint: {
    color: "#5B6B66",
    fontSize: 13
  },
  row: {
    marginTop: 8,
    gap: 4
  },
  error: {
    color: "#9A2B2B",
    fontWeight: "600"
  }
});
