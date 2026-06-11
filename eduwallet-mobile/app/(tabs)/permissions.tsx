// app/(tabs)/permissions.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { useStudent } from "../../src/context/StudentContext";
import {
  getPermissionsWithSession,
  revokePermissionWithSession,
  grantPermissionWithSession,
  getFriendlyApiErrorMessage,
} from "../../src/lib/api";
import type { PermissionStatus } from "../../src/types";

type PermissionAction = "refresh" | "revoke" | "grant-view" | "grant-update" | null;

type ConfirmationDialog = {
  title: string;
  message: string;
  confirmLabel: string;
  isDestructive?: boolean;
  onConfirm: () => void;
};

export default function PermissionsScreen() {
  const { id, sca, sessionToken, data } = useStudent();

  const [perms, setPerms] = useState<PermissionStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [submittingAction, setSubmittingAction] = useState<PermissionAction>(null);
  const [submittingOrganization, setSubmittingOrganization] = useState<string | null>(null);
  const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialog | null>(null);

  const mapPermissionsToStatuses = (all: {
    studentSca: string;
    permissions: {
      universityAddress: string;
      read: boolean;
      write: boolean;
      readRequested: boolean;
      writeRequested: boolean;
      universityName?: string;
      universityCountry?: string;
      universityShortName?: string;
    }[];
  }): PermissionStatus[] => {
    return all.permissions.map((entry) => {
      const read = !!entry.read;
      const write = !!entry.write;

      let level: 0 | 1 | 2 | 3 = 0;
      if (read) level = (level | 1) as 0 | 1 | 2 | 3;
      if (write) level = (level | 2) as 0 | 1 | 2 | 3;

      return {
        studentSca: all.studentSca,
        universitySmartAccount: entry.universityAddress,
        universityName: entry.universityName ?? "",
        universityCountry: entry.universityCountry ?? "",
        universityShortName: entry.universityShortName ?? "",
        read,
        write,
        readRequested: !!entry.readRequested,
        writeRequested: !!entry.writeRequested,
        level,
      };
    });
  };

  useEffect(() => {
    if (!data?.allPermissions) return;
    const mapped = mapPermissionsToStatuses(data.allPermissions);
    setPerms(mapped);
  }, [data?.allPermissions]);

  function shortenIdentifier(value?: string | null) {
    if (!value) return "Unknown / N/A";
    if (value.length <= 12) return value;
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  }

  function getOrganizationLabel(perm: PermissionStatus) {
    if (perm.universityName && perm.universityShortName) {
      return `${perm.universityName} (${perm.universityShortName})`;
    }

    return (
      perm.universityName ||
      perm.universityShortName ||
      shortenIdentifier(perm.universitySmartAccount)
    );
  }

  function getCurrentAccessLabel(perm: PermissionStatus) {
    const hasViewAccess = perm.read || perm.write;
    const hasUpdateAccess = perm.write;

    if (hasViewAccess && hasUpdateAccess) {
      return "View and update access";
    }

    if (hasUpdateAccess) {
      return "Update access";
    }

    if (hasViewAccess) {
      return "View access";
    }

    return "No access";
  }

  function getPendingRequestText(type: "read" | "write") {
    if (type === "write") {
      return "This organization wants to add or update academic results in your EduWallet.";
    }

    return "This organization wants to view and check your academic records.";
  }

  function getApproveConfirmationText(type: "read" | "write", organizationLabel: string) {
    if (type === "write") {
      return `This will allow ${organizationLabel} to add or update academic results in your EduWallet.`;
    }

    return `This will allow ${organizationLabel} to view and check your academic records.`;
  }

  async function refreshPermissions() {
    if (!sca || !sessionToken) {
      setError("Your EduWallet session has expired. Please log in again.");
      return;
    }

    setLoading(true);
    setError(null);
    setSubmittingAction("refresh");
    setSubmittingOrganization(null);

    try {
      const permissions = await getPermissionsWithSession(sca, sessionToken);
      const mapped = mapPermissionsToStatuses(permissions);
      setPerms(mapped);
    } catch (e: unknown) {
      setError(getFriendlyApiErrorMessage(e, "Could not check for new requests."));
    } finally {
      setLoading(false);
      setSubmittingAction(null);
      setSubmittingOrganization(null);
    }
  }

  async function revokeAccess(perm: PermissionStatus) {
    if (!sca || !sessionToken) {
      setError("Your EduWallet session has expired. Please log in again.");
      return;
    }

    setError(null);
    setSubmittingAction("revoke");
    setSubmittingOrganization(perm.universitySmartAccount);

    try {
      await revokePermissionWithSession(sca, sessionToken, perm.universitySmartAccount);
      await refreshPermissions();
    } catch (e: unknown) {
      setError(getFriendlyApiErrorMessage(e, "Could not remove access."));
      setSubmittingAction(null);
      setSubmittingOrganization(null);
    }
  }

  function confirmRevokeAccess(perm: PermissionStatus) {
    const organizationLabel = getOrganizationLabel(perm);

    setConfirmationDialog({
      title: "Remove access?",
      message: `${organizationLabel} will no longer be able to access your EduWallet records.`,
      confirmLabel: "Remove access",
      isDestructive: true,
      onConfirm: () => revokeAccess(perm),
    });
  }

  async function approveRequest(perm: PermissionStatus, type: "read" | "write") {
    if (!sca || !sessionToken) {
      setError("Your EduWallet session has expired. Please log in again.");
      return;
    }

    setError(null);
    setSubmittingAction(type === "write" ? "grant-update" : "grant-view");
    setSubmittingOrganization(perm.universitySmartAccount);

    try {
      await grantPermissionWithSession(sca, sessionToken, type, perm.universitySmartAccount);
      await refreshPermissions();
    } catch (e: unknown) {
      setError(getFriendlyApiErrorMessage(e, "Could not approve the access request."));
      setSubmittingAction(null);
      setSubmittingOrganization(null);
    }
  }

  function confirmApproveRequest(perm: PermissionStatus, type: "read" | "write") {
    const organizationLabel = getOrganizationLabel(perm);

    setConfirmationDialog({
      title: "Approve request?",
      message: getApproveConfirmationText(type, organizationLabel),
      confirmLabel: "Approve",
      onConfirm: () => approveRequest(perm, type),
    });
  }

  function closeConfirmationDialog() {
    setConfirmationDialog(null);
  }

  function handleConfirmDialog() {
    const onConfirm = confirmationDialog?.onConfirm;
    setConfirmationDialog(null);
    onConfirm?.();
  }

  function isSubmittingFor(perm: PermissionStatus, action: PermissionAction) {
    return submittingAction === action && submittingOrganization === perm.universitySmartAccount;
  }

  if (!sca || !id) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>You must log in first.</Text>
      </View>
    );
  }

  if (!sessionToken) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Access</Text>
        <Text style={styles.error}>
          Your EduWallet session is missing. Please log out and log in again.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Access</Text>
      <Text style={styles.subtitle}>
        Review and approve which organizations can use your EduWallet records.
      </Text>

      <Pressable
        style={[
          styles.primaryButton,
          (loading || submittingAction !== null) && styles.buttonDisabled,
        ]}
        onPress={refreshPermissions}
        disabled={loading || submittingAction !== null}
      >
        <Text style={styles.primaryButtonText}>
          {submittingAction === "refresh" ? "Checking..." : "Check for new requests"}
        </Text>
      </Pressable>

      {loading && <ActivityIndicator style={styles.loadingIndicator} />}

      {error && <Text style={styles.error}>{error}</Text>}

      {perms.length === 0 && !loading && !error ? (
        <View style={styles.emptyStateBox}>
          <Text style={styles.emptyStateTitle}>No access requests yet</Text>
          <Text style={styles.emptyStateText}>
            When an organization asks to view or update your records, the request will appear here.
          </Text>
        </View>
      ) : null}

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {perms.map((perm) => {
          const effectiveView = perm.read || perm.write;
          const effectiveUpdate = perm.write;

          const hasPermission = effectiveView || effectiveUpdate;
          const hasViewRequest = perm.readRequested && !effectiveView;
          const hasUpdateRequest = perm.writeRequested && !effectiveUpdate;
          const hasPendingRequest = hasViewRequest || hasUpdateRequest;

          const organizationLabel = getOrganizationLabel(perm);
          const countryLabel = perm.universityCountry || null;

          return (
            <View style={styles.card} key={perm.universitySmartAccount}>
              <Text style={styles.cardTitle}>{organizationLabel}</Text>

              {countryLabel ? <Text style={styles.cardSubtitle}>{countryLabel}</Text> : null}

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Access status</Text>
                <Text style={styles.accessStatusValue}>{getCurrentAccessLabel(perm)}</Text>
              </View>

              {hasPendingRequest ? (
                <View style={styles.pendingBox}>
                  <Text style={styles.pendingTitle}>
                    {hasUpdateRequest ? "Pending update request" : "Pending view request"}
                  </Text>

                  <Text style={styles.pendingText}>
                    {getPendingRequestText(hasUpdateRequest ? "write" : "read")}
                  </Text>

                  {hasViewRequest ? (
                    <Pressable
                      style={[
                        styles.primaryButton,
                        isSubmittingFor(perm, "grant-view") && styles.buttonDisabled,
                      ]}
                      onPress={() => confirmApproveRequest(perm, "read")}
                      disabled={submittingAction !== null}
                    >
                      <Text style={styles.primaryButtonText}>
                        {isSubmittingFor(perm, "grant-view") ? "Approving..." : "Approve request"}
                      </Text>
                    </Pressable>
                  ) : null}

                  {hasUpdateRequest ? (
                    <Pressable
                      style={[
                        styles.primaryButton,
                        isSubmittingFor(perm, "grant-update") && styles.buttonDisabled,
                      ]}
                      onPress={() => confirmApproveRequest(perm, "write")}
                      disabled={submittingAction !== null}
                    >
                      <Text style={styles.primaryButtonText}>
                        {isSubmittingFor(perm, "grant-update") ? "Approving..." : "Approve request"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              {hasPermission ? (
                <Pressable
                  style={[
                    styles.dangerButton,
                    isSubmittingFor(perm, "revoke") && styles.buttonDisabled,
                  ]}
                  onPress={() => confirmRevokeAccess(perm)}
                  disabled={submittingAction !== null}
                >
                  <Text style={styles.dangerButtonText}>
                    {isSubmittingFor(perm, "revoke") ? "Removing..." : "Remove access"}
                  </Text>
                </Pressable>
              ) : null}

              {!hasPermission && !hasPendingRequest ? (
                <Text style={styles.emptyCardText}>
                  This organization does not currently have access.
                </Text>
              ) : null}

              <Text style={styles.technicalLabel}>
                Reference: {shortenIdentifier(perm.universitySmartAccount)}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <Modal
        visible={confirmationDialog !== null}
        transparent
        animationType="fade"
        onRequestClose={closeConfirmationDialog}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{confirmationDialog?.title}</Text>
            <Text style={styles.modalText}>{confirmationDialog?.message}</Text>

            <View style={styles.modalButtonRow}>
              <Pressable
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={closeConfirmationDialog}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modalButton,
                  styles.modalConfirmButton,
                  confirmationDialog?.isDestructive && styles.modalConfirmButtonDestructive,
                ]}
                onPress={handleConfirmDialog}
              >
                <Text style={styles.modalConfirmButtonText}>
                  {confirmationDialog?.confirmLabel}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 10,
  },
  subtitle: {
    color: "#aaa",
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 18,
  },
  error: {
    color: "#ff6b6b",
    marginBottom: 12,
  },
  emptyStateBox: {
    backgroundColor: "#1a1d23",
    borderRadius: 18,
    padding: 18,
    marginTop: 12,
    marginBottom: 16,
  },
  emptyStateTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyStateText: {
    color: "#aaa",
    fontSize: 15,
    lineHeight: 22,
  },
  list: {
    marginTop: 10,
  },
  loadingIndicator: {
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#1a1d23",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 15,
    color: "#888",
    marginBottom: 16,
  },
  section: {
    marginTop: 6,
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#aaa",
    marginBottom: 6,
  },
  accessStatusValue: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  pendingBox: {
    backgroundColor: "#222733",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 6,
  },
  pendingText: {
    fontSize: 14,
    color: "#c5cbd7",
    lineHeight: 20,
    marginBottom: 14,
  },
  emptyCardText: {
    color: "#888",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  technicalLabel: {
    fontSize: 12,
    color: "#777",
    marginTop: 10,
  },
  primaryButton: {
    backgroundColor: "#2f9cf4",
    borderRadius: 6,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  dangerButton: {
    backgroundColor: "#ff6b6b",
    borderRadius: 6,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 4,
  },
  dangerButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#1a1d23",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2a2f3a",
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
  },
  modalText: {
    color: "#c5cbd7",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 16,
    minWidth: 92,
    alignItems: "center",
  },
  modalCancelButton: {
    backgroundColor: "#222733",
    borderWidth: 1,
    borderColor: "#343b4a",
  },
  modalConfirmButton: {
    backgroundColor: "#2f9cf4",
  },
  modalConfirmButtonDestructive: {
    backgroundColor: "#ff6b6b",
  },
  modalCancelButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  modalConfirmButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.65,
  },
});
