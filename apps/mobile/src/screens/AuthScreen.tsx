import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { loginUser, registerUser, setAuthToken } from "../lib/api";

export function AuthScreen({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (mode: "register" | "login") => {
    setStatus("loading");
    setError(null);

    try {
      const payload = { email: email.trim(), password };
      const response =
        mode === "register"
          ? await registerUser(payload)
          : await loginUser(payload);

      await setAuthToken(response.token);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>
          Sign in to start uploading and tracking your swings.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 8 chars)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          label={status === "loading" ? "Working..." : "Register"}
          onPress={() => handleAuth("register")}
          disabled={status === "loading" || !email.trim() || !password}
        />
        <PrimaryButton
          label={status === "loading" ? "Working..." : "Login"}
          onPress={() => handleAuth("login")}
          disabled={status === "loading" || !email.trim() || !password}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#F4F6F5"
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    gap: 12
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F1A17"
  },
  subtitle: {
    color: "#3C4A46"
  },
  input: {
    borderWidth: 1,
    borderColor: "#C3CCC8",
    borderRadius: 10,
    padding: 12,
    fontSize: 16
  },
  error: {
    color: "#9A2B2B",
    fontWeight: "600"
  }
});
