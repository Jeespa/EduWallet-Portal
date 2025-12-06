import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStudent } from "./context/StudentContext";

export default function ProfileScreen() {
  const router = useRouter();
  const { id, sca, data, clearStudent } = useStudent();

  const isLoggedIn = !!id && !!sca && !!data;
  const student = data?.student;

  const handleLogout = () => {
    clearStudent();
    router.replace("/"); // back to login
  };

  if (!isLoggedIn || !student) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={24} color="#ffffff" />
          </Pressable>
          <Text style={styles.title}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={styles.infoText}>
          Please log in from the Wallet tab to see your profile.
        </Text>
      </View>
    );
  }

  const fullName = `${student.name} ${student.surname}`;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={24} color="#ffffff" />
        </Pressable>

        <Text style={styles.title}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Id</Text>
        <Text style={styles.fieldValue}>{id}</Text>

        <Text style={styles.fieldLabel}>Wallet address</Text>
        <Text style={styles.fieldValue}>{sca}</Text>

        <Text style={styles.fieldLabel}>Full name</Text>
        <Text style={styles.fieldValue}>{fullName}</Text>

        <Text style={styles.fieldLabel}>Birth date</Text>
        <Text style={styles.fieldValue}>{student.birthDate}</Text>

        <Text style={styles.fieldLabel}>Birth place</Text>
        <Text style={styles.fieldValue}>{student.birthPlace}</Text>

        <Text style={styles.fieldLabel}>Country</Text>
        <Text style={styles.fieldValue}>{student.country}</Text>
      </View>

      {/* 🔴 Logout button */}
      <Pressable
        onPress={handleLogout}
        style={({ pressed }) => [
          styles.logoutButton,
          pressed && { opacity: 0.8 },
        ]}
      >
        <Text style={styles.logoutButtonText}>Log out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
    backgroundColor: "#0f1115",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: "#cccccc",
  },
  card: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#1a1d23",
  },
  fieldLabel: {
    fontSize: 12,
    color: "#9fa9ff",
    marginTop: 10,
  },
  fieldValue: {
    fontSize: 14,
    color: "#ffffff",
    marginTop: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  logoutButton: {
    marginTop: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ff6b6b",
    paddingVertical: 12,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#ff6b6b",
    fontWeight: "600",
    fontSize: 14,
  },
});
