// app/_layout.tsx
import { Stack } from "expo-router";
import { StudentProvider } from "./context/StudentContext";
import { View } from "react-native";

export default function RootLayout() {
  return (
    <StudentProvider>
      <View style={{ flex: 1, backgroundColor: "#0f1115" }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#0f1115" }, // for all stack screens
          }}
        >
          <Stack.Screen
            name="(tabs)"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="profile"
            options={{ headerShown: false }}
          />
        </Stack>
      </View>
    </StudentProvider>
  );
}
