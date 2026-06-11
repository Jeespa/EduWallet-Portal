import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PortalAuthProvider } from "../src/context/PortalAuthContext";

export default function RootLayout() {
  return (
    <PortalAuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </PortalAuthProvider>
  );
}
