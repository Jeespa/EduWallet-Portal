// app/(tabs)/index.tsx
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  Button,
  ScrollView,
  Linking,
  Pressable,
} from "react-native";
import { useStudent } from "../../src/context/StudentContext";
import type { CredentialsResponse } from "../../src/types";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { login } from "../../src/lib/api";

/**
 * Main tab screen.
 *
 * This screen has two modes:
 *  - Login view: shows ID and password fields and calls the gateway login endpoint.
 *  - Wallet view: once logged in, shows a summary of the student's credits,
 *    main university, and a list of courses with certificate links.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { id: ctxId, sca: ctxSca, data: ctxData, setStudent } = useStudent();

  // Pre fill the login ID if we already have a session in context
  const [loginId, setLoginId] = useState(ctxId ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local copy of the latest credentials response
  const [data, setData] = useState<CredentialsResponse | null>(ctxData ?? null);

  const isLoggedIn = !!ctxSca && !!ctxId && !!data;

  // Sum ECTS credits across all courses that have a numeric ects field
  const totalEcts =
    data?.student?.results?.reduce((sum, r) => {
      const ects = typeof r.ects === "number" ? r.ects : 0;
      return sum + ects;
    }, 0) ?? 0;

  // Label for the "main" or origin university.
  // For now this is simply taken from the first result, if any.
  const mainUniversityLabel =
    data?.student?.results && data.student.results.length > 0
      ? data.student.results[0].university.shortName ||
        data.student.results[0].university.name ||
        "Unknown"
      : null;

  /**
   * Perform login via the gateway and populate both local state
   * and the global StudentContext.
   */
  const loginAndLoadWallet = async () => {
    if (!loginId || !password) {
      setError("Please enter ID and password");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const creds = await login(loginId, password);

      setData(creds);
      setStudent(creds.id, creds.studentSca, creds);
      setPassword("");
    } catch (e: any) {
      setError(e.message || "Login failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header row: app title and profile icon if logged in */}
      <View style={styles.headerRow}>
        <Text style={styles.appTitle}>EduWallet</Text>
        {isLoggedIn ? (
          <Pressable onPress={() => router.push("/profile")}>
            <Ionicons name="person-outline" size={24} color="#ffffff" />
          </Pressable>
        ) : (
          // Reserve the same width when not logged in to avoid layout jumps
          <View style={{ width: 24 }} />
        )}
      </View>

      {!isLoggedIn || !data ? (
        // LOGIN VIEW
        <>
          <Text style={styles.label}>Student ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Student ID"
            placeholderTextColor="#888888"
            value={loginId}
            onChangeText={setLoginId}
            autoCapitalize="none"
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#888888"
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            secureTextEntry
          />
          <Button title={loading ? "Logging in..." : "Login"} onPress={loginAndLoadWallet} />
          {error && <Text style={styles.error}>{error}</Text>}
        </>
      ) : (
        // WALLET VIEW
        <>
          {error && <Text style={styles.error}>{error}</Text>}

          <ScrollView style={styles.walletContainer}>
            <Text style={styles.greeting}>
              Hello <Text style={styles.greetingName}>{data.student.name}</Text>
            </Text>

            {/* Total ECTS "balance" card */}
            <View style={styles.ectsCard}>
              <Text style={styles.ectsLabel}>Total credits balance</Text>
              <Text style={styles.ectsValue}>{totalEcts.toFixed(1)} ECTS</Text>
            </View>

            {/* Simple origin university label under the balance */}
            {mainUniversityLabel && (
              <Text style={styles.mainUniversity}>{mainUniversityLabel}</Text>
            )}

            <Text style={styles.sectionTitle}>Courses</Text>

            {!data.student.results || data.student.results.length === 0 ? (
              <Text style={styles.muted}>No courses found.</Text>
            ) : (
              data.student.results.map((r, idx) => (
                <Pressable
                  key={idx}
                  onPress={() =>
                    router.push({
                      pathname: "/course/[index]",
                      params: { index: String(idx) },
                    })
                  }
                >
                  <View style={styles.courseRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.courseTitle}>
                        {r.name} <Text style={styles.courseCode}>({r.code})</Text>
                      </Text>
                      <Text style={styles.courseSub}>
                        {r.degreeCourse} • {r.university.shortName}
                      </Text>

                      {r.certificate && (
                        <Text
                          style={styles.certificateLink}
                          onPress={() => Linking.openURL(r.certificate!)}
                        >
                          View certificate
                        </Text>
                      )}
                    </View>
                    <View style={styles.courseRight}>
                      <Text style={styles.courseGrade}>
                        {r.grade && r.grade.trim().length > 0 ? r.grade : "-"}
                      </Text>
                      <Text style={styles.courseEcts}>
                        {typeof r.ects === "number" ? r.ects.toFixed(1) : "0.0"}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
    backgroundColor: "#0f1115",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: "#cccccc",
  },
  input: {
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
    color: "#ffffff",
    backgroundColor: "#1a1d23",
  },
  error: {
    color: "#ff6b6b",
    marginTop: 4,
  },
  walletContainer: {
    marginTop: 10,
  },
  greeting: {
    fontSize: 20,
    color: "#ffffff",
    marginBottom: 12,
  },
  greetingName: {
    fontWeight: "bold",
  },
  ectsCard: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#3b3ff0",
  },
  ectsLabel: {
    color: "#f0f0f0",
    fontSize: 13,
    marginBottom: 6,
  },
  ectsValue: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "bold",
  },
  mainUniversity: {
    alignSelf: "center",
    marginBottom: 16,
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 10,
  },
  muted: {
    fontSize: 14,
    color: "#888",
  },
  courseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  courseTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  courseCode: {
    color: "#9fa9ff",
    fontSize: 12,
  },
  courseSub: {
    color: "#aaaaaa",
    fontSize: 12,
  },
  courseRight: {
    alignItems: "flex-end",
    marginLeft: 12,
  },
  courseGrade: {
    color: "#c3b3ff",
    fontSize: 16,
    fontWeight: "bold",
  },
  courseEcts: {
    color: "#ffffff",
    fontSize: 14,
  },
  certificateLink: {
    marginTop: 4,
    fontSize: 12,
    color: "#9fa9ff",
    textDecorationLine: "underline",
  },
});
