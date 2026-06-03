import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { PORTAL_COLORS as COLORS } from "../../src/constants/portalTheme";
import { usePortalAuth } from "../../src/context/PortalAuthContext";
import { listPortalRequests } from "../../src/lib/portalBackendApi";
import type { PortalRequest } from "../../src/types/portal";

type RequestSummary = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

function formatRole(role?: string) {
  if (!role) return "-";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function buildRequestSummary(requests: PortalRequest[]): RequestSummary {
  return requests.reduce(
    (summary, request) => {
      summary.total += 1;

      if (request.status === "approved") {
        summary.approved += 1;
      } else if (request.status === "rejected") {
        summary.rejected += 1;
      } else {
        summary.pending += 1;
      }

      return summary;
    },
    {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    },
  );
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

function formatPermission(permissionType: PortalRequest["permissionType"]) {
  return permissionType === "write" ? "Update access" : "View access";
}

function shortenIdentifier(value?: string | null) {
  if (!value) return "-";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatActivityText(request: PortalRequest) {
  const studentLabel = request.studentName
    ? request.studentName
    : request.studentId
      ? `student ${shortenIdentifier(request.studentId)}`
      : "a student";

  return `${formatPermission(request.permissionType)} requested for ${studentLabel}`;
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

export default function DashboardHome() {
  const { token, user, organization } = usePortalAuth();

  const [requests, setRequests] = useState<PortalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      if (!token) return;

      setLoading(true);
      setLoadError("");

      try {
        const result = await listPortalRequests(token);

        if (!cancelled) {
          setRequests(result);
        }
      } catch (err: any) {
        if (!cancelled) {
          setLoadError(err?.message || "Could not load dashboard data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const summary = useMemo(() => buildRequestSummary(requests), [requests]);

  const recentRequests = useMemo(() => {
    return [...requests].slice(0, 5);
  }, [requests]);

  const roleLabel = formatRole(user?.permissionLevel);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>
        Overview of the current organization workspace.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current session</Text>

        <View style={styles.sessionGrid}>
          <View style={styles.infoBlock}>
            <Text style={styles.label}>Organization</Text>
            <Text style={styles.value}>{organization?.name || "-"}</Text>
          </View>

          <View style={styles.infoBlock}>
            <Text style={styles.label}>Organization number</Text>
            <Text style={styles.value}>
              {organization?.organizationNumber || "-"}
            </Text>
          </View>

          <View style={styles.infoBlock}>
            <Text style={styles.label}>Signed-in user</Text>
            <Text style={styles.value}>{user?.name || "-"}</Text>
          </View>

          <View style={styles.infoBlock}>
            <Text style={styles.label}>Role</Text>
            <Text style={styles.value}>{roleLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.overviewGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summary.pending}</Text>
          <Text style={styles.statLabel}>Pending requests</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summary.approved}</Text>
          <Text style={styles.statLabel}>Approved requests</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summary.rejected}</Text>
          <Text style={styles.statLabel}>Rejected requests</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summary.total}</Text>
          <Text style={styles.statLabel}>Total requests</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.cardTitle}>Recent activity</Text>
          {loading ? <Text style={styles.headerMeta}>Loading...</Text> : null}
        </View>

        {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

        {!loading && !loadError && recentRequests.length === 0 ? (
          <Text style={styles.emptyText}>
            No recent activity yet. Activity will appear here when access
            requests, verifications, or submissions are created.
          </Text>
        ) : null}

        {recentRequests.map((request) => (
          <View key={request.id} style={styles.activityItem}>
            <View style={styles.activityHeader}>
              <Text style={styles.activityTitle}>
                {formatActivityText(request)}
              </Text>

              <View
                style={[
                  styles.statusBadge,
                  request.status === "approved"
                    ? styles.statusApproved
                    : request.status === "rejected"
                      ? styles.statusRejected
                      : styles.statusPending,
                ]}
              >
                <Text style={styles.statusBadgeText}>
                  {formatStatus(request.status)}
                </Text>
              </View>
            </View>

            {request.homeInstitution ? (
              <Text style={styles.activityMeta}>
                {request.homeInstitution}
              </Text>
            ) : null}

            <Text style={styles.activityMeta}>
              EduWallet reference:{" "}
              {shortenIdentifier(request.studentId ?? request.studentSca)}
            </Text>

            <Text style={styles.activityMeta}>
              Created: {formatDateTime(request.createdAt)}
            </Text>

            {request.reason ? (
              <Text style={styles.activityReason}>{request.reason}</Text>
            ) : null}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 24,
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
    lineHeight: 23,
    marginBottom: 22,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 22,
    marginBottom: 18,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "700",
  },
  sessionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
    marginTop: 18,
  },
  infoBlock: {
    minWidth: 220,
    flex: 1,
  },
  label: {
    color: COLORS.muted,
    fontSize: 13,
    marginBottom: 4,
  },
  value: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
  },
  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 20,
  },
  statValue: {
    color: COLORS.accent,
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 8,
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    gap: 12,
  },
  headerMeta: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  error: {
    color: COLORS.danger,
    fontSize: 14,
    marginBottom: 12,
  },
  activityItem: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 8,
  },
  activityTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  activityMeta: {
    color: COLORS.muted,
    fontSize: 13,
    marginBottom: 4,
  },
  activityReason: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPending: {
    backgroundColor: COLORS.warning,
  },
  statusApproved: {
    backgroundColor: COLORS.success,
  },
  statusRejected: {
    backgroundColor: COLORS.dangerDark,
  },
  statusBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
  },
});