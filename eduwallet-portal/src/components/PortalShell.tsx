import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, usePathname, type Href } from "expo-router";
import { PORTAL_COLORS as COLORS } from "../constants/portalTheme";
import { usePortalAuth } from "../context/PortalAuthContext";

type NavItem = {
  id: string;
  label: string;
  href: Href;
};

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard" },
  { id: "students", label: "Students", href: "/students" },
  { id: "requests", label: "Requests", href: "/requests" },
  { id: "verify", label: "Verify", href: "/verify" },
  { id: "issue", label: "Issue", href: "/issue" },
  { id: "settings", label: "Settings", href: "/settings" },
];

export function PortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, organization, signOut } = usePortalAuth();

  return (
    <View style={styles.screen}>
      <View style={styles.sidebar}>
        <View>
          <Text style={styles.brand}>EduWallet Portal</Text>
          <Text style={styles.orgName}>{organization?.name}</Text>

          <View style={styles.navSection}>
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Pressable
                  key={item.id}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                  onPress={() => router.push(item.href)}
                >
                  <Text
                    style={[
                      styles.navItemText,
                      isActive && styles.navItemTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.sidebarFooter}>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userMeta}>{user?.email}</Text>
          <Text style={styles.userMeta}>
            {user?.permissionLevel} · {organization?.organizationNumber}
          </Text>

          <Pressable style={styles.signOutButton} onPress={signOut}>
            <Text style={styles.signOutButtonText}>Sign out</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Portal Workspace</Text>
        </View>

        <View style={styles.contentInner}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: COLORS.background,
  },
  sidebar: {
    width: 280,
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: "space-between",
  },
  brand: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
  },
  orgName: {
    color: COLORS.muted,
    fontSize: 14,
    marginBottom: 28,
  },
  navSection: {
    gap: 10,
  },
  navItem: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  navItemActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  navItemText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
  },
  navItemTextActive: {
    color: "#FFFFFF",
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 18,
  },
  userName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  userMeta: {
    color: COLORS.muted,
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  signOutButton: {
    marginTop: 8,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  signOutButtonText: {
    color: COLORS.text,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    height: 72,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: COLORS.background,
  },
  topBarTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "700",
  },
  contentInner: {
    flex: 1,
    padding: 24,
  },
});