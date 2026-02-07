import { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { LibraryScreen } from "./src/screens/LibraryScreen";
import { UploadScreen } from "./src/screens/UploadScreen";
import { SwingDetailScreen } from "./src/screens/SwingDetailScreen";
import { SwingAnalyzeScreen } from "./src/screens/SwingAnalyzeScreen";
import { StatusBar } from "expo-status-bar";
import { AuthScreen } from "./src/screens/AuthScreen";
import { getAuthToken } from "./src/lib/api";

const Stack = createNativeStackNavigator();

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadToken = async () => {
      const stored = await getAuthToken();
      setToken(stored);
      setLoading(false);
    };

    loadToken();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#1B3A2F" />
      </View>
    );
  }

  if (!token) {
    return <AuthScreen onSuccess={async () => setToken(await getAuthToken())} />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator>
        <Stack.Screen name="Library" component={LibraryScreen} />
        <Stack.Screen name="Upload" component={UploadScreen} />
        <Stack.Screen
          name="SwingDetail"
          component={SwingDetailScreen}
          options={{ title: "Swing" }}
        />
        <Stack.Screen
          name="SwingAnalyze"
          component={SwingAnalyzeScreen}
          options={{ title: "Analyze" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
