import { ScrollView, StyleSheet, Text, View } from "react-native";
import { PORTAL_COLORS as COLORS } from "../constants/portalTheme";
import { usePortalAuth } from "../context/PortalAuthContext";

export default function SettingsPage() {
  const { user, organization } = usePortalAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>
        Review organization, account, and portal configuration details.
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

        <Text style={styles.note}>
          In a later version, this section can include onboarding status,
          organization verification, and integration settings.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Signed-in account</Text>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Name</Text>
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

        <Text style={styles.note}>
          Per-user roles are organization-specific. Later, admins can manage
          additional portal users and assign permissions here.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Portal capabilities</Text>

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, styles.statusAvailable]} />
          <View style={styles.statusTextWrap}>
            <Text style={styles.statusTitle}>Student lookup</Text>
            <Text style={styles.statusText}>
              Available through the Students page with mocked data.
            </Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, styles.statusAvailable]} />
          <View style={styles.statusTextWrap}>
            <Text style={styles.statusTitle}>Permission requests</Text>
            <Text style={styles.statusText}>
              Available through the Requests page with mocked creation and
              filtering.
            </Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, styles.statusAvailable]} />
          <View style={styles.statusTextWrap}>
            <Text style={styles.statusTitle}>Verification</Text>
            <Text style={styles.statusText}>
              Available through the Verify page with mocked verification flow.
            </Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, styles.statusPlanned]} />
          <View style={styles.statusTextWrap}>
            <Text style={styles.statusTitle}>Issuing new records</Text>
            <Text style={styles.statusText}>
              Planned for a later phase when the backend and permission model are
              ready.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Environment and integration</Text>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Portal mode</Text>
          <Text style={styles.value}>Mock / local development</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Authentication</Text>
          <Text style={styles.value}>Mock portal users linked to organizations</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Student source</Text>
          <Text style={styles.value}>
            Existing EduWallet students authenticated through student clients
          </Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Gateway/backend</Text>
          <Text style={styles.value}>Not yet fully integrated</Text>
        </View>

        <Text style={styles.note}>
          This page should later expose real environment values, backend health,
          organization onboarding status, and role-management tools.
        </Text>
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
  note: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginTop: 4,
  },
  statusAvailable: {
    backgroundColor: "#1E5A3A",
  },
  statusPlanned: {
    backgroundColor: "#5B4A1F",
  },
  statusTextWrap: {
    flex: 1,
  },
  statusTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  statusText: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});