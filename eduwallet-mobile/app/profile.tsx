// app/profile.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Button,
  Alert,
} from "react-native";
import { useStudent } from "../context/StudentContext";
import { router } from "expo-router";

/**
 * Profile screen.
 *
 * Shows basic personal data and wallet information for the currently
 * logged in student, plus a logout button that clears the StudentContext.
 * The header and back arrow are provided by the root Stack layout.
 */
export default function ProfileScreen() {
  const { id, sca, data, clearStudent } = useStudent();

  const student = data?.student;

  /**
   * Ask for confirmation before clearing the in memory session.
   * (On logout, the user is sent back to the login view the next time.)
   */
  const handleLogout = () => {
    Alert.alert(
      "Log out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log out",
          style: "destructive",
          onPress: () => {
            clearStudent();
            router.push({
              pathname: "/",
            });
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {!student ? (
        <Text style={styles.muted}>
          No student loaded. Please log in first.
        </Text>
      ) : (
        <>
          {/* Personal details card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Personal details</Text>
            <Text style={styles.row}>
              <Text style={styles.label}>Name: </Text>
              {student.name} {student.surname}
            </Text>
            <Text style={styles.row}>
              <Text style={styles.label}>Birth date: </Text>
              {student.birthDate || "-"}
            </Text>
            <Text style={styles.row}>
              <Text style={styles.label}>Birth place: </Text>
              {student.birthPlace || "-"}
            </Text>
            <Text style={styles.row}>
              <Text style={styles.label}>Country: </Text>
              {student.country || "-"}
            </Text>
          </View>

          {/* Wallet summary card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Wallet</Text>
            <Text style={styles.row}>
              <Text style={styles.label}>Smart account: </Text>
              {sca}
            </Text>
            <Text style={styles.row}>
              <Text style={styles.label}>Courses: </Text>
              {student.results?.length ?? 0}
            </Text>
          </View>

          {/* Logout button */}
          <View style={styles.logoutWrapper}>
            <Button title="Log out" color="#ff6b6b" onPress={handleLogout} />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16, // Header (title + back arrow) is handled by the Stack layout
    paddingHorizontal: 16,
    paddingBottom: 32,
    backgroundColor: "#0f1115",
    flexGrow: 1,
  },
  muted: {
    color: "#888",
    fontSize: 14,
  },
  card: {
    backgroundColor: "#1a1d23",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 8,
  },
  row: {
    color: "#ffffff",
    fontSize: 14,
    marginBottom: 4,
  },
  label: {
    fontWeight: "600",
  },
  logoutWrapper: {
    marginTop: 16,
  },
});
