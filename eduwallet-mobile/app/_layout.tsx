// app/_layout.tsx
import { Stack } from "expo-router";
import { StudentProvider } from "../context/StudentContext";
import { View } from "react-native";

export default function RootLayout() {
  return (
    <StudentProvider>
      <View style={{ flex: 1, backgroundColor: "#0f1115" }}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#0f1115" },
            headerTintColor: "#ffffff",
            headerTitleStyle: { color: "#ffffff" },
            contentStyle: { backgroundColor: "#0f1115" },
          }}
        >
          {/* Main tabbed app, with its own header (usually hidden) */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

          {/* Course stack keeps its own layout & back button */}
          <Stack.Screen name="course" options={{ headerShown: false }} />

          {/* Profile gets a native header with back arrow */}
          <Stack.Screen
            name="profile"
            options={{
              title: "Profile",
            }}
          />
        </Stack>
      </View>
    </StudentProvider>
  );
}
