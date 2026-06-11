import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { PORTAL_COLORS as COLORS } from "../../src/constants/portalTheme";
import { usePortalAuth } from "../../src/context/PortalAuthContext";
import type { PermissionType, PortalRequest } from "../../src/types/portal";
import { createPortalPermissionRequest, listPortalRequests } from "../../src/lib/portalBackendApi";

// Request filters use portal wording, while the backend still stores read/write permission types.
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
  { value: "read", label: "View" },
  { value: "write", label: "Update" },
];

function shortenIdentifier(value: string) {
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatStatus(status: PortalRequest["status"]) {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "pending":
    default:
      return "Pending";
  }
}

/** Maps backend permission types to the friendlier portal labels used in the UI. */
function formatPermission(permissionType: PermissionType) {
  return permissionType === "write" ? "Update access" : "View access";
}

function getRequestTitle(request: PortalRequest) {
  if (request.studentName) {
    return `Request for ${request.studentName}`;
  }

  if (request.studentId) {
    return `Request for student ${shortenIdentifier(request.studentId)}`;
  }

  return "Access request";
}

function normalizePermissionType(value?: string | string[]): PermissionType {
  return value === "write" ? "write" : "read";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("nb-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function RequestsPage() {
  const { token } = usePortalAuth();

  const params = useLocalSearchParams<{
    studentId?: string;
    studentSca?: string;
    studentName?: string;
    homeInstitution?: string;
    permissionType?: string;
  }>();

  const [studentId, setStudentId] = useState("");
  const [studentSca, setStudentSca] = useState("");
  const [studentName, setStudentName] = useState("");
  const [homeInstitution, setHomeInstitution] = useState("");
  const [permissionType, setPermissionType] = useState<PermissionType>("read");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [requests, setRequests] = useState<PortalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [openedFromStudentCard, setOpenedFromStudentCard] = useState(false);

  const [requestQuery, setRequestQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatusFilter>("pending");
  const [permissionFilter, setPermissionFilter] = useState<RequestPermissionFilter>("all");

  useEffect(() => {
    // StudentsPage passes these route params when a request starts from a student card.
    const hasStudentId = typeof params.studentId === "string" && params.studentId.trim();
    const hasStudentSca = typeof params.studentSca === "string" && params.studentSca.trim();

    if (hasStudentId) {
      setStudentId(params.studentId as string);
    }

    if (hasStudentSca) {
      setStudentSca(params.studentSca as string);
    }

    if (typeof params.studentName === "string" && params.studentName.trim()) {
      setStudentName(params.studentName);
    }

    if (typeof params.homeInstitution === "string" && params.homeInstitution.trim()) {
      setHomeInstitution(params.homeInstitution);
    }

    if (typeof params.permissionType === "string") {
      setPermissionType(normalizePermissionType(params.permissionType));
    }

    if (hasStudentId || hasStudentSca) {
      setShowNewRequestForm(true);
      setOpenedFromStudentCard(true);
    }
  }, [
    params.studentId,
    params.studentSca,
    params.studentName,
    params.homeInstitution,
    params.permissionType,
  ]);

  const loadRequests = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const result = await listPortalRequests(token);
      setRequests(result);
    } catch (err: any) {
      setError(err?.message || "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const displayedRequests = useMemo(() => {
    // Filtering is local because listPortalRequests already returns the organization-scoped history.
    const normalized = requestQuery.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesQuery =
        !normalized ||
        request.studentSca.toLowerCase().includes(normalized) ||
        (request.studentId?.toLowerCase().includes(normalized) ?? false) ||
        (request.studentName?.toLowerCase().includes(normalized) ?? false) ||
        (request.homeInstitution?.toLowerCase().includes(normalized) ?? false) ||
        request.reason.toLowerCase().includes(normalized) ||
        request.createdAt.toLowerCase().includes(normalized);

      const matchesStatus = statusFilter === "all" ? true : request.status === statusFilter;

      const matchesPermission =
        permissionFilter === "all" ? true : request.permissionType === permissionFilter;

      return matchesQuery && matchesStatus && matchesPermission;
    });
  }, [requests, requestQuery, statusFilter, permissionFilter]);

  const hasSelectedStudent = Boolean(studentId || studentSca);
  const hasHumanReadableStudent = Boolean(studentName || homeInstitution);

  const resetForm = () => {
    setStudentId("");
    setStudentSca("");
    setStudentName("");
    setHomeInstitution("");
    setReason("");
    setPermissionType("read");
    setError("");
    setSuccessMessage("");
    setOpenedFromStudentCard(false);
  };

  /**
   * Creates a portal-side access request.
   * The student still has to approve it in the mobile app before access changes on-chain.
   */
  const handleCreateRequest = async () => {
    setError("");
    setSuccessMessage("");

    if (!token) {
      setError("You must be logged in to create a request.");
      return;
    }

    if (!studentSca.trim()) {
      setError("Please select a student or enter an EduWallet address.");
      return;
    }

    if (!reason.trim()) {
      setError("Please add a short reason for the request.");
      return;
    }

    setCreating(true);

    try {
      await createPortalPermissionRequest(token, {
        studentId: studentId.trim() || undefined,
        studentSca: studentSca.trim(),
        permissionType,
        reason: reason.trim(),
      });

      setSuccessMessage(
        "Request submitted. The student must approve it from the EduWallet mobile app.",
      );
      setReason("");
      setPermissionType("read");
      setStatusFilter("pending");
      setPermissionFilter("all");
      setRequestQuery("");
      setShowNewRequestForm(false);
      setOpenedFromStudentCard(false);

      await loadRequests();
    } catch (err: any) {
      setError(err?.message || "Failed to create request.");
    } finally {
      setCreating(false);
    }
  };

  const newRequestForm = showNewRequestForm ? (
    <View style={styles.card}>
      <View style={styles.formHeader}>
        <Text style={styles.cardTitle}>New request</Text>

        <Pressable
          style={styles.clearButton}
          onPress={() => {
            resetForm();
            setShowNewRequestForm(false);
          }}
        >
          <Text style={styles.clearButtonText}>Cancel</Text>
        </Pressable>
      </View>

      {hasSelectedStudent ? (
        <View style={styles.selectedStudentBox}>
          <Text style={styles.selectedStudentTitle}>Selected student</Text>

          <Text style={styles.selectedStudentName}>
            {studentName || "Selected EduWallet student"}
          </Text>

          {homeInstitution ? (
            <Text style={styles.selectedStudentText}>{homeInstitution}</Text>
          ) : null}

          {studentId ? (
            <Text style={styles.selectedStudentMeta}>
              EduWallet reference: {shortenIdentifier(studentId)}
            </Text>
          ) : null}
        </View>
      ) : null}

      {!hasHumanReadableStudent ? (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Student identifier</Text>
            <TextInput
              value={studentId}
              onChangeText={setStudentId}
              placeholder="Student identifier"
              placeholderTextColor={COLORS.muted}
              style={styles.input}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>EduWallet address</Text>
            <TextInput
              value={studentSca}
              onChangeText={setStudentSca}
              placeholder="0x..."
              placeholderTextColor={COLORS.muted}
              style={styles.input}
              autoCapitalize="none"
            />
          </View>
        </>
      ) : null}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Access level</Text>

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
              View
            </Text>
            <Text
              style={[
                styles.permissionHint,
                permissionType === "read" && styles.permissionHintActive,
              ]}
            >
              View and verify records
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
                permissionType === "write" && styles.permissionButtonTextActive,
              ]}
            >
              Update
            </Text>
            <Text
              style={[
                styles.permissionHint,
                permissionType === "write" && styles.permissionHintActive,
              ]}
            >
              Add or update results
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Reason</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Explain why access is needed"
          placeholderTextColor={COLORS.muted}
          style={[styles.input, styles.textArea]}
          multiline
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.createButton, creating && styles.createButtonDisabled]}
        onPress={handleCreateRequest}
        disabled={creating}
      >
        <Text style={styles.createButtonText}>
          {creating ? "Creating request..." : "Create request"}
        </Text>
      </Pressable>
    </View>
  ) : null;

  // The request list is historical. Current access state is shown on the Students page.
  const requestsList = (
    <View style={styles.card}>
      <View style={styles.resultsHeader}>
        <View style={styles.resultsHeaderText}>
          <Text style={styles.cardTitle}>Requests</Text>
          <Text style={styles.cardSubtitle}>
            Track pending, approved, and rejected access requests.
          </Text>
        </View>

        <Pressable
          style={styles.newRequestButtonLarge}
          onPress={() => {
            setError("");
            setSuccessMessage("");
            setOpenedFromStudentCard(false);
            setShowNewRequestForm((current) => !current);
          }}
        >
          <Text style={styles.newRequestButtonLargeText}>
            {showNewRequestForm ? "Close form" : "+ New request"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.listToolbar}>
        <Text style={styles.resultsCount}>
          {displayedRequests.length} result
          {displayedRequests.length === 1 ? "" : "s"}
        </Text>

        <Pressable style={styles.refreshButton} onPress={loadRequests}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </Pressable>
      </View>

      <TextInput
        value={requestQuery}
        onChangeText={setRequestQuery}
        placeholder="Search by student reference, reason, or date"
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
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.filterLabel}>Access level</Text>
      <View style={styles.filterRow}>
        {PERMISSION_FILTER_OPTIONS.map((option) => {
          const isActive = permissionFilter === option.value;

          return (
            <Pressable
              key={option.value}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setPermissionFilter(option.value)}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? <Text style={styles.emptyText}>Loading requests...</Text> : null}

      {!loading && displayedRequests.length === 0 ? (
        <Text style={styles.emptyText}>No matching requests found.</Text>
      ) : null}

      {!loading
        ? displayedRequests.map((request) => (
            <View key={request.id} style={styles.requestItem}>
              <View style={styles.requestHeader}>
                <Text style={styles.requestTitle}>{getRequestTitle(request)}</Text>

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
                  <Text style={styles.badgeText}>{formatStatus(request.status)}</Text>
                </View>
              </View>

              {request.homeInstitution ? (
                <Text style={styles.requestMeta}>{request.homeInstitution}</Text>
              ) : null}

              {request.studentId ? (
                <Text style={styles.requestMeta}>
                  EduWallet reference: {shortenIdentifier(request.studentId)}
                </Text>
              ) : null}

              <Text style={styles.requestMeta}>
                Access level: {formatPermission(request.permissionType)}
              </Text>

              <Text style={styles.requestMeta}>Created: {formatDateTime(request.createdAt)}</Text>

              <Text style={styles.requestReason}>{request.reason}</Text>

              {request.status === "pending" ? (
                <Text style={styles.pendingNote}>
                  Waiting for the student to approve this request in the mobile app.
                </Text>
              ) : null}
            </View>
          ))
        : null}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Access requests</Text>
      <Text style={styles.subtitle}>Review access requests and create new access requests.</Text>

      {successMessage ? (
        <View style={styles.successBox}>
          <Text style={styles.successTitle}>Request created</Text>
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      ) : null}

      {openedFromStudentCard ? newRequestForm : null}
      {requestsList}
      {!openedFromStudentCard ? newRequestForm : null}
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
  },
  cardSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  resultsHeaderText: {
    flex: 1,
  },
  listToolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    gap: 12,
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
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  selectedStudentName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  selectedStudentText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  selectedStudentMeta: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 8,
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
    fontWeight: "700",
  },
  permissionButtonTextActive: {
    color: "#FFFFFF",
  },
  permissionHint: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  permissionHintActive: {
    color: "#FFFFFF",
  },
  error: {
    color: COLORS.danger,
    marginBottom: 14,
    fontSize: 14,
  },
  successBox: {
    backgroundColor: COLORS.success,
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  successTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  successText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 18,
  },
  createButton: {
    marginTop: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    maxWidth: 220,
  },
  createButtonDisabled: {
    opacity: 0.65,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  resultsCount: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  refreshButton: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  refreshButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  newRequestButtonLarge: {
    backgroundColor: COLORS.accent,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  newRequestButtonLargeText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "700",
  },
  clearButton: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  clearButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
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
    gap: 12,
  },
  requestTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
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
  pendingNote: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgePending: {
    backgroundColor: COLORS.warning,
  },
  badgeApproved: {
    backgroundColor: COLORS.success,
  },
  badgeRejected: {
    backgroundColor: COLORS.dangerDark,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
