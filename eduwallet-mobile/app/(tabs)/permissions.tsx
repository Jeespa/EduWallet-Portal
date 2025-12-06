// app/(tabs)/permissions.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useStudent } from "../context/StudentContext";
import type { PermissionStatus } from "../types";
import { getPermissions } from "./index";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function PermissionsScreen() {
  const router = useRouter();
  const { id, sca, data } = useStudent();

  const [permissions, setPermissions] = useState<PermissionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isLoggedIn = !!id && !!sca && !!data;

  useEffect(() => {
    if (!isLoggedIn || !sca) return;

    const load = async () => {
      try {
        setLoading(true);
        setErr(null);
        const p = await getPermissions(sca);
        setPermissions(p);
      } catch (e: any) {
        setErr(e.message ?? "Failed to load permissions");
        setPermissions(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isLoggedIn, sca]);

  const handleRevoke = async () => {
    if (!sca) return;
    try {
      setLoading(true);
      setErr(null);

      const res = await fetch(
        `http://192.168.1.12:3000/students/${sca}/permissions/revoke`,
        { method: "POST" }
      );

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(
          j?.error || `Failed to revoke permission (${res.status})`
        );
      }

      // Refresh permissions after revoke
      const refreshed = await getPermissions(sca);
      setPermissions(refreshed);
    } catch (e: any) {
      setErr(e.message ?? "Failed to revoke permission");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // NOT LOGGED IN VIEW
  // ─────────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Permissions</Text>
          {/* no profile icon before login, just a spacer */}
          <View style={{ width: 24 }} />
        </View>
        <Text style={styles.infoText}>
          Please log in from the Wallet tab to see and manage permissions.
        </Text>
      </View>
    );
  }

  // figure out a nice university label
  let universityName: string | undefined = permissions?.universityName;
  let universityShort: string | undefined =
    permissions?.universityShortName;

  // fallback to first course's university (like the browser extension)
  if ((!universityName || !universityShort) && data?.student?.results?.length) {
    const uni = data.student.results[0].university;
    if (!universityName) universityName = uni.name;
    if (!universityShort) universityShort = uni.shortName;
  }

  const universityLabel = universityName
    ? `${universityName}${universityShort ? ` (${universityShort})` : ""}`
    : "Unknown university";

  // ─────────────────────────────────────────────────────────────
  // LOGGED IN VIEW
  // ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header row: title + profile icon (only when logged in) */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Permissions</Text>
        <Pressable onPress={() => router.push("/profile")}>
          <Ionicons name="person-outline" size={24} color="#ffffff" />
        </Pressable>
      </View>

      {loading && !permissions && (
        <ActivityIndicator size="small" color="#ffffff" />
      )}

      {err && <Text style={styles.error}>{err}</Text>}

      {!loading && permissions && (
        <ScrollView style={styles.scroll}>
          <View style={styles.card}>
            <Text style={styles.universityName}>{universityLabel}</Text>

            <View style={styles.badgeRow}>
              <Text style={styles.badge}>
                {permissions.level === 0 && "No access"}
                {permissions.level === 1 && "Read access"}
                {permissions.level === 2 && "Write access"}
                {permissions.level === 3 && "Read & Write"}
              </Text>
            </View>

            {(permissions.readRequested || permissions.writeRequested) && (
              <Text style={styles.pendingText}>
                Pending requests:
                {permissions.readRequested && " read"}
                {permissions.writeRequested && " write"}
              </Text>
            )}

            {!permissions.readRequested && !permissions.writeRequested && (
              <Text style={styles.pendingText}>
                No pending permission requests.
              </Text>
            )}

            <Pressable
              onPress={handleRevoke}
              style={({ pressed }) => [
                styles.revokeButton,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.revokeButtonText}>Revoke access</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {!loading && !permissions && !err && (
        <Text style={styles.infoText}>No permission data available.</Text>
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
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
  },
  scroll: {
    marginTop: 8,
  },
  card: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#1a1d23",
  },
  universityName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: "row",
    marginTop: 6,
    marginBottom: 6,
  },
  badge: {
    fontSize: 12,
    color: "#0f1115",
    backgroundColor: "#9fa9ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pendingText: {
    fontSize: 12,
    color: "#cccccc",
    marginTop: 8,
  },
  revokeButton: {
    marginTop: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ff6b6b",
    paddingVertical: 10,
    alignItems: "center",
  },
  revokeButtonText: {
    color: "#ff6b6b",
    fontWeight: "600",
    fontSize: 14,
  },
  infoText: {
    fontSize: 14,
    color: "#cccccc",
  },
  error: {
    color: "#ff6b6b",
    marginBottom: 10,
  },
});
