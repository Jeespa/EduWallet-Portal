import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { PORTAL_COLORS as COLORS } from "../constants/portalTheme";
import { usePortalAuth } from "../context/PortalAuthContext";
import type { PermissionType, PortalRequest } from "../types/portal";
import { MOCK_REQUESTS, createMockRequest } from "../lib/mockPortalRequests";

type RequestStatusFilter = "all" | "pending" | "approved" | "rejected";
type RequestPermissionFilter = "all" | PermissionType;

const STATUS_FILTER_OPTIONS: Array<{
  value: RequestStatusFilter;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const PERMISSION_FILTER_OPTIONS: Array<{
  value: RequestPermissionFilter;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "read", label: "Read" },
  { value: "write", label: "Write" },
];

export default function RequestsPage() {
  const { organization } = usePortalAuth();

  const params = useLocalSearchParams<{
    studentId?: string;
    studentSca?: string;
  }>();

  const [studentId, setStudentId] = useState("");
  const [studentSca, setStudentSca] = useState("");
  const [permissionType, setPermissionType] =
    useState<PermissionType>("read");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [requests, setRequests] = useState<PortalRequest[]>(MOCK_REQUESTS);

  const [requestQuery, setRequestQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<RequestStatusFilter>("all");
  const [permissionFilter, setPermissionFilter] =
    useState<RequestPermissionFilter>("all");

  useEffect(() => {
    if (typeof params.studentId === "string" && params.studentId.trim()) {
      setStudentId(params.studentId);
    }

    if (typeof params.studentSca === "string" && params.studentSca.trim()) {
      setStudentSca(params.studentSca);
    }
  }, [params.studentId, params.studentSca]);

  const displayedRequests = useMemo(() => {
    const normalized = requestQuery.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesQuery =
        !normalized ||
        request.studentSca.toLowerCase().includes(normalized) ||
        request.requesterOrgName.toLowerCase().includes(normalized) ||
        request.reason.toLowerCase().includes(normalized) ||
        request.createdAt.toLowerCase().includes(normalized);

      const matchesStatus =
        statusFilter === "all" ? true : request.status === statusFilter;

      const matchesPermission =
        permissionFilter === "all"
          ? true
          : request.permissionType === permissionFilter;

      return matchesQuery && matchesStatus && matchesPermission;
    });
  }, [requests, requestQuery, statusFilter, permissionFilter]);

  const handleCreateRequest = () => {
    setError("");

    if (!studentSca.trim()) {
      setError("Please enter the student smart-account address.");
      return;
    }

    if (!reason.trim()) {
      setError("Please add a short reason for the request.");
      return;
    }

    const newRequest = createMockRequest({
      studentSca: studentSca.trim(),
      requesterOrgName: organization?.name ?? "Unknown Organization",
      permissionType,
      reason: reason.trim(),
    });

    setRequests((prev) => [newRequest, ...prev]);
    setReason("");
    setPermissionType("read");
    setStatusFilter("all");
    setPermissionFilter("all");
    setRequestQuery("");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Requests</Text>
      <Text style={styles.subtitle}>
        Create and track permission requests sent to students.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>New request</Text>

        {studentId || studentSca ? (
          <View style={styles.selectedStudentBox}>
            <Text style={styles.selectedStudentTitle}>Selected student</Text>

            {studentId ? (
              <Text style={styles.selectedStudentText}>
                Student ID: {studentId}
              </Text>
            ) : null}

            {studentSca ? (
              <Text style={styles.selectedStudentText}>
                Smart-account: {studentSca}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Student smart-account address</Text>
          <TextInput
            value={studentSca}
            onChangeText={setStudentSca}
            placeholder="0x..."
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Permission type</Text>

          <View style={styles.permissionRow}>
            <Pressable
              style={[
                styles.permissionButton,
                permissionType === "read" && styles.permissionButtonActive,
              ]}
              onPress={() => setPermissionType("read")}
            >
              <Text
                style={[
                  styles.permissionButtonText,
                  permissionType === "read" && styles.permissionButtonTextActive,
                ]}
              >
                Read
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.permissionButton,
                permissionType === "write" && styles.permissionButtonActive,
              ]}
              onPress={() => setPermissionType("write")}
            >
              <Text
                style={[
                  styles.permissionButtonText,
                  permissionType === "write" &&
                    styles.permissionButtonTextActive,
                ]}
              >
                Write
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Reason</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Explain why this organization needs access"
            placeholderTextColor={COLORS.muted}
            style={[styles.input, styles.textArea]}
            multiline
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.createButton} onPress={handleCreateRequest}>
          <Text style={styles.createButtonText}>Create request</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.resultsHeader}>
          <Text style={styles.cardTitle}>Recent requests</Text>
          <Text style={styles.resultsCount}>
            {displayedRequests.length} result
            {displayedRequests.length === 1 ? "" : "s"}
          </Text>
        </View>

        <TextInput
          value={requestQuery}
          onChangeText={setRequestQuery}
          placeholder="Search by student, organization, reason, or date"
          placeholderTextColor={COLORS.muted}
          style={styles.input}
          autoCapitalize="none"
        />

        <Text style={styles.filterLabel}>Status</Text>
        <View style={styles.filterRow}>
          {STATUS_FILTER_OPTIONS.map((option) => {
            const isActive = statusFilter === option.value;

            return (
              <Pressable
                key={option.value}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setStatusFilter(option.value)}
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

        <Text style={styles.filterLabel}>Permission type</Text>
        <View style={styles.filterRow}>
          {PERMISSION_FILTER_OPTIONS.map((option) => {
            const isActive = permissionFilter === option.value;

            return (
              <Pressable
                key={option.value}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setPermissionFilter(option.value)}
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

        {displayedRequests.length === 0 ? (
          <Text style={styles.emptyText}>No matching requests found.</Text>
        ) : (
          displayedRequests.map((request) => (
            <View key={request.id} style={styles.requestItem}>
              <View style={styles.requestHeader}>
                <Text style={styles.requestOrg}>{request.requesterOrgName}</Text>
                <View
                  style={[
                    styles.badge,
                    request.status === "approved"
                      ? styles.badgeApproved
                      : request.status === "rejected"
                      ? styles.badgeRejected
                      : styles.badgePending,
                  ]}
                >
                  <Text style={styles.badgeText}>{request.status}</Text>
                </View>
              </View>

              <Text style={styles.requestMeta}>
                Student: {request.studentSca}
              </Text>
              <Text style={styles.requestMeta}>
                Permission: {request.permissionType}
              </Text>
              <Text style={styles.requestMeta}>Created: {request.createdAt}</Text>
              <Text style={styles.requestReason}>{request.reason}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 10,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 16,
    marginBottom: 24,
  },
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
  selectedStudentBox: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  selectedStudentTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  selectedStudentText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
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
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  permissionRow: {
    flexDirection: "row",
    gap: 12,
  },
  permissionButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  permissionButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  permissionButtonText: {
    color: COLORS.text,
    fontWeight: "600",
  },
  permissionButtonTextActive: {
    color: "#FFFFFF",
  },
  error: {
    color: COLORS.danger,
    marginBottom: 14,
    fontSize: 14,
  },
  createButton: {
    marginTop: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    maxWidth: 220,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  resultsCount: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  filterLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 18,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 4,
  },
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
  filterChipText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 15,
    marginTop: 14,
  },
  requestItem: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  requestOrg: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    marginRight: 12,
  },
  requestMeta: {
    color: COLORS.muted,
    fontSize: 14,
    marginBottom: 4,
  },
  requestReason: {
    color: COLORS.text,
    fontSize: 14,
    marginTop: 10,
    lineHeight: 20,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgePending: {
    backgroundColor: "#5B4A1F",
  },
  badgeApproved: {
    backgroundColor: "#1E5A3A",
  },
  badgeRejected: {
    backgroundColor: "#6A2A2A",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
});