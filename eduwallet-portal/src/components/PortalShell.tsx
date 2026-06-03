import { ReactNode, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, usePathname, type Href } from "expo-router";
import { PORTAL_COLORS as COLORS } from "../constants/portalTheme";
import { usePortalAuth } from "../context/PortalAuthContext";

type NavItem = {
  id: string;
  label: string;
  href: Href;
  description: string;
  requiresIssuer?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    description: "Overview",
  },
  {
    id: "students",
    label: "Students",
    href: "/students",
    description: "Find student wallets",
  },
  {
    id: "requests",
    label: "Access requests",
    href: "/requests",
    description: "Review and create requests",
  },
  {
    id: "verify",
    label: "Check record",
    href: "/verify",
    description: "Verify EduWallet records",
  },
  {
    id: "issue",
    label: "Issue result",
    href: "/issue",
    description: "Submit academic results",
    requiresIssuer: true,
  },
];

function formatRole(role?: string) {
  if (!role) return "-";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function canShowIssuePage(input: {
  role?: string;
  organizationName?: string;
  organizationNumber?: string;
}) {
  const role = input.role?.toLowerCase();
  const organizationName = input.organizationName?.toLowerCase() ?? "";

  const hasIssuerRole = role === "issuer" || role === "admin";

  const isAcademicIssuer =
    input.organizationNumber === "974767880" ||
    organizationName.includes("ntnu") ||
    organizationName.includes("university");

  return hasIssuerRole && isAcademicIssuer;
}

export function PortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, organization, signOut } = usePortalAuth();

  const navItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      if (!item.requiresIssuer) return true;

      return canShowIssuePage({
        role: user?.permissionLevel,
        organizationName: organization?.name,
        organizationNumber: organization?.organizationNumber,
      });
    });
  }, [
    organization?.name,
    organization?.organizationNumber,
    user?.permissionLevel,
  ]);

  const handleSignOut = () => {
    signOut();
    router.replace("/login");
  };

  return (
    <View style={styles.screen}>
      <View style={styles.sidebar}>
        <ScrollView
          style={styles.sidebarScroll}
          contentContainerStyle={styles.sidebarScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View>
            <View style={styles.brandBlock}>
              <Text style={styles.brand}>EduWallet Portal</Text>
              <Text style={styles.brandSubtitle}>
                Organization access to student-owned academic records
              </Text>
            </View>

            <View style={styles.navSection}>
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

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
                    <Text
                      style={[
                        styles.navItemDescription,
                        isActive && styles.navItemDescriptionActive,
                      ]}
                    >
                      {item.description}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.sidebarFooter}>
            <Text style={styles.footerLabel}>Signed in as</Text>
            <Text style={styles.userName}>{user?.name || "-"}</Text>
            <Text style={styles.userMeta}>{user?.email || "-"}</Text>

            <View style={styles.footerMetaBlock}>
              <Text style={styles.footerMetaLabel}>Organization</Text>
              <Text style={styles.footerMetaValue}>
                {organization?.name || "-"}
              </Text>
            </View>

            <Text style={styles.rolePill}>
              {formatRole(user?.permissionLevel)}
            </Text>

            <Pressable style={styles.signOutButton} onPress={handleSignOut}>
              <Text style={styles.signOutButtonText}>Sign out</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>

      <View style={styles.content}>
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
    width: 300,
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  sidebarScroll: {
    flex: 1,
  },
  sidebarScrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 24,
  },
  brandBlock: {
    marginBottom: 26,
  },
  brand: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
  },
  brandSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  navSection: {
    gap: 10,
  },
  navItem: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 14,
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
    fontWeight: "700",
    marginBottom: 3,
  },
  navItemTextActive: {
    color: "#FFFFFF",
  },
  navItemDescription: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  navItemDescriptionActive: {
    color: "#EAF1FF",
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 18,
  },
  footerLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
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
    marginBottom: 12,
    lineHeight: 18,
  },
  footerMetaBlock: {
    marginBottom: 10,
  },
  footerMetaLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  footerMetaValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  rolePill: {
    alignSelf: "flex-start",
    color: "#FFFFFF",
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 12,
  },
  signOutButton: {
    marginTop: 4,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  signOutButtonText: {
    color: COLORS.text,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentInner: {
    flex: 1,
    padding: 24,
  },
});