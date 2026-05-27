import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { PORTAL_COLORS as COLORS } from "../../src/constants/portalTheme";
import {
  searchPortalStudents,
  type PortalStudentReference,
} from "../../src/lib/portalBackendApi";
import { usePortalAuth } from "../../src/context/PortalAuthContext";

type PermissionStatus =
  | "none"
  | "pending-read"
  | "pending-write"
  | "read"
  | "write";

type PermissionFilter = "all" | PermissionStatus;

const FILTER_OPTIONS: Array<{ value: PermissionFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "read", label: "Read" },
  { value: "write", label: "Write" },
  { value: "pending-read", label: "Pending Read" },
  { value: "pending-write", label: "Pending Write" },
  { value: "none", label: "No Access" },
];

function getRequestButtonLabel(status: PermissionStatus) {
  if (status === "read") return "Request write access";
  return "Request access";
}

function getRequestPermissionType(status: PermissionStatus) {
  if (status === "read") return "write";
  return "read";
}

export default function StudentsPage() {
  const { token } = usePortalAuth();

  const [students, setStudents] = useState<PortalStudentReference[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedFilter, setSelectedFilter] =
    useState<PermissionFilter>("all");

  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      if (!token) return;

      setLoading(true);
      setLoadError("");

      try {
        const results = await searchPortalStudents(token, query);

        if (!cancelled) {
          setStudents(results);
        }
      } catch (err: any) {
        if (!cancelled) {
          setLoadError(err?.message || "Failed to load students.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    const timeout = setTimeout(loadStudents, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [token, query]);

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return students.filter((student) => {
      const status = student.permissionStatus ?? "none";

      const matchesQuery =
        !normalizedQuery ||
        student.studentId.toLowerCase().includes(normalizedQuery) ||
        student.studentSca.toLowerCase().includes(normalizedQuery) ||
        (student.name?.toLowerCase().includes(normalizedQuery) ?? false) ||
        (student.homeInstitution?.toLowerCase().includes(normalizedQuery) ??
          false);

      const matchesStatus =
        selectedFilter === "all" || status === selectedFilter;

      return matchesQuery && matchesStatus;
    });
  }, [students, query, selectedFilter]);

  const renderPermissionLabel = (status?: PermissionStatus) => {
    switch (status) {
      case "pending-read":
        return "Pending Read";
      case "pending-write":
        return "Pending Write";
      case "read":
        return "Read Access";
      case "write":
        return "Write Access";
      case "none":
      default:
        return "No Access";
    }
  };

  const getBadgeStyle = (status?: PermissionStatus) => {
    switch (status) {
      case "read":
      case "write":
        return styles.badgeApproved;
      case "pending-read":
      case "pending-write":
        return styles.badgePending;
      case "none":
      default:
        return styles.badgeNeutral;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Students</Text>
      <Text style={styles.subtitle}>
        Look up existing EduWallet students by student ID or smart-account
        address.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Student lookup</Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by student ID, smart-account, name, or institution"
          placeholderTextColor={COLORS.muted}
          style={styles.input}
          autoCapitalize="none"
        />

        <Text style={styles.filterLabel}>Permission filter</Text>

        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map((option) => {
            const isActive = selectedFilter === option.value;

            return (
              <Pressable
                key={option.value}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setSelectedFilter(option.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.resultsHeader}>
          <Text style={styles.cardTitle}>Results</Text>
          <Text style={styles.resultsCount}>
            {filteredStudents.length} result
            {filteredStudents.length === 1 ? "" : "s"}
          </Text>
        </View>

        {loading ? (
          <Text style={styles.emptyText}>Loading students...</Text>
        ) : null}

        {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

        {!loading && !loadError && filteredStudents.length === 0 ? (
          <Text style={styles.emptyText}>No matching students found.</Text>
        ) : null}

        {!loading && !loadError
          ? filteredStudents.map((student) => {
              const permissionStatus = student.permissionStatus ?? "none";
              const canIssueResult = permissionStatus === "write";
              const requestPending =
                permissionStatus === "pending-read" ||
                permissionStatus === "pending-write";
              const canRequestAccess = permissionStatus !== "write";

              return (
                <View key={student.studentId} style={styles.studentCard}>
                  <View style={styles.studentHeader}>
                    <View style={styles.studentHeaderText}>
                      <Text style={styles.studentName}>
                        {student.name || "Unknown student"}
                      </Text>
                      <Text style={styles.studentId}>
                        Student ID: {student.studentId}
                      </Text>
                    </View>

                    <View
                      style={[styles.badge, getBadgeStyle(permissionStatus)]}
                    >
                      <Text style={styles.badgeText}>
                        {renderPermissionLabel(permissionStatus)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoBlock}>
                    <Text style={styles.label}>Smart-account</Text>
                    <Text style={styles.value}>{student.studentSca}</Text>
                  </View>

                  <View style={styles.infoBlock}>
                    <Text style={styles.label}>Home institution</Text>
                    <Text style={styles.value}>
                      {student.homeInstitution || "-"}
                    </Text>
                  </View>

                  <View style={styles.actionsRow}>
                    {canRequestAccess ? (
                      requestPending ? (
                        <View style={styles.disabledButton}>
                          <Text style={styles.disabledButtonText}>
                            Request pending
                          </Text>
                        </View>
                      ) : (
                        <Pressable
                          style={styles.primaryButton}
                          onPress={() =>
                            router.push({
                              pathname: "/requests",
                              params: {
                                studentId: student.studentId,
                                studentSca: student.studentSca,
                                permissionType:
                                  getRequestPermissionType(permissionStatus),
                              },
                            })
                          }
                        >
                          <Text style={styles.primaryButtonText}>
                            {getRequestButtonLabel(permissionStatus)}
                          </Text>
                        </Pressable>
                      )
                    ) : null}

                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() =>
                        router.push({
                          pathname: "/verify",
                          params: {
                            studentId: student.studentId,
                            studentSca: student.studentSca,
                          },
                        })
                      }
                    >
                      <Text style={styles.secondaryButtonText}>Verify</Text>
                    </Pressable>

                    {canIssueResult ? (
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={() =>
                          router.push({
                            pathname: "/issue",
                            params: {
                              studentId: student.studentId,
                              studentSca: student.studentSca,
                            },
                          })
                        }
                      >
                        <Text style={styles.secondaryButtonText}>
                          Issue result
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })
          : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 32 },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 10,
  },
  subtitle: { color: COLORS.muted, fontSize: 16, marginBottom: 24 },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 18,
  },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 15,
  },
  filterLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 18,
    marginBottom: 10,
  },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  filterChip: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  filterChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  filterChipText: { color: COLORS.text, fontSize: 13, fontWeight: "600" },
  filterChipTextActive: { color: "#FFFFFF" },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  resultsCount: { color: COLORS.muted, fontSize: 13, fontWeight: "600" },
  emptyText: { color: COLORS.muted, fontSize: 15 },
  error: {
    color: COLORS.danger,
    marginBottom: 14,
    fontSize: 14,
  },
  studentCard: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  studentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
    gap: 12,
  },
  studentHeaderText: { flex: 1 },
  studentName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  studentId: { color: COLORS.muted, fontSize: 14 },
  infoBlock: { marginBottom: 12 },
  label: { color: COLORS.muted, fontSize: 13, marginBottom: 4 },
  value: { color: COLORS.text, fontSize: 15, fontWeight: "600" },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeNeutral: { backgroundColor: "#334155" },
  badgePending: { backgroundColor: "#5B4A1F" },
  badgeApproved: { backgroundColor: "#1E5A3A" },
  badgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    flexWrap: "wrap",
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "700" },
  secondaryButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  secondaryButtonText: { color: COLORS.text, fontWeight: "700" },
  disabledButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    opacity: 0.75,
  },
  disabledButtonText: {
    color: COLORS.muted,
    fontWeight: "700",
  },
});