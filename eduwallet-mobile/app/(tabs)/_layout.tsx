// app/(tabs)/_layout.tsx
import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStudent } from "../context/StudentContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const { id, sca, data } = useStudent();
  const isLoggedIn = !!id && !!sca && !!data;

  const insets = useSafeAreaInsets();

  const baseTabBarStyle = {
    backgroundColor: "#0f1115",
    borderTopWidth: 0,
  } as const;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "#888888",
        tabBarStyle: isLoggedIn
          ? {
              ...baseTabBarStyle,
              height: 60 + (insets.bottom || 0),
              paddingBottom: insets.bottom || 8,
            }
          : { ...baseTabBarStyle, height: 0, display: "none" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Wallet",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="permissions"
        options={{
          title: "Permissions",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="lock-closed-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
