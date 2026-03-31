import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { PORTAL_COLORS as COLORS } from "../constants/portalTheme";
import { usePortalAuth } from "../context/PortalAuthContext";
import { MOCK_REQUESTS } from "../lib/mockPortalRequests";
import { getDashboardSummary } from "../lib/mockPortalDashboard";

export default function DashboardHome() {
  const { user, organization } = usePortalAuth();
  const summary = getDashboardSummary(MOCK_REQUESTS);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>
        Welcome back, {user?.name}. Here is an overview of your portal activity.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Organization</Text>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Organization name</Text>
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
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email || "-"}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Permission level</Text>
          <Text style={styles.value}>{user?.permissionLevel || "-"}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summary.total}</Text>
          <Text style={styles.statLabel}>Total requests</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summary.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summary.approved}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summary.rejected}</Text>
          <Text style={styles.statLabel}>Rejected</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick actions</Text>

        <View style={styles.actionsRow}>
          <Pressable
            style={styles.actionButton}
            onPress={() => router.push("/requests")}
          >
            <Text style={styles.actionButtonTitle}>New Request</Text>
            <Text style={styles.actionButtonText}>
              Request read or write access from a student.
            </Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() => router.push("/verify")}
          >
            <Text style={styles.actionButtonTitle}>Verify Certificate</Text>
            <Text style={styles.actionButtonText}>
              Check a certificate or result using mock verification.
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 18,
  },
  infoBlock: {
    marginBottom: 14,
  },
  label: {
    color: COLORS.muted,
    fontSize: 13,
    marginBottom: 4,
  },
  value: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
    flexWrap: "wrap",
    alignItems: "stretch",
  },
  statCard: {
    minWidth: 180,
    flex: 1,
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
  actionsRow: {
    flexDirection: "row",
    gap: 16,
    flexWrap: "wrap",
    alignItems: "stretch",
  },
  actionButton: {
    flex: 1,
    minWidth: 260,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 20,
  },
  actionButtonTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 8,
  },
  actionButtonText: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});