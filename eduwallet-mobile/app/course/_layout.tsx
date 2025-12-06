// app/course/_layout.tsx
import { Stack } from "expo-router";

export default function CourseLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0f1115" },
        headerTintColor: "#ffffff",
        headerTitle: "",
        contentStyle: { backgroundColor: "#0f1115" },
      }}
    >
      <Stack.Screen name="[index]" options={{ title: "" }} />
    </Stack>
  );
}
