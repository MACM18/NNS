import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppearanceProvider } from "../theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppearanceProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
      </AppearanceProvider>
    </SafeAreaProvider>
  );
}
