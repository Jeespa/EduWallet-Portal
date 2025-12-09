// app/(tabs)/permissions.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Button,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
} from "react-native";
import { useStudent } from "../../context/StudentContext";
import {
  getPermissions,
  revokePermission,
  grantPermission,
} from "../../lib/api";
import type { PermissionStatus } from "../../types";

/**
 * Local representation of which permission action is waiting
 * for password confirmation in the modal.
 */
type PendingAction = "revoke" | "grant-read" | "grant-write" | null;

/**
 * Permissions screen in the mobile app.
 *
 * Shows a multi university view of:
 *  - current read and write access for each university
 *  - pending read and write requests
 *
 * Any change (grant or revoke) is done via the gateway and
 * requires the student password, which is collected in a modal.
 */
export default function PermissionsScreen() {
  // Credentials and login payload from the global student context
  const { id, sca, data } = useStudent();

  // List of per university permissions
  const [perms, setPerms] = useState<PermissionStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for the confirmation modal
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [submitting, setSubmitting] = useState(false);

  // The university that the user is currently acting on
  const [selectedPerm, setSelectedPerm] = useState<PermissionStatus | null>(
    null
  );

  /**
   * Helper to convert the gateway multi university payload into the
   * PermissionStatus structure that the UI expects.
   */
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

      // Keep a bit mask level for compatibility with the browser extension
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

  /**
   * On login, the gateway already returns an "allPermissions" snapshot.
   * Use that snapshot to populate the screen immediately, without
   * prompting for the password.
   */
  useEffect(() => {
    if (!data?.allPermissions) return;
    const mapped = mapPermissionsToStatuses(data.allPermissions);
    setPerms(mapped);
  }, [data?.allPermissions]);

  /**
   * Open the password confirmation modal for a given action.
   */
  const openModal = (action: PendingAction, perm: PermissionStatus | null) => {
    setPendingAction(action);
    setSelectedPerm(perm);
    setPassword("");
    setPasswordModalVisible(true);
  };

  /**
   * Close the password modal.
   * While a request is in flight we ignore close to avoid odd states.
   */
  const closeModal = () => {
    if (submitting) return;
    setPasswordModalVisible(false);
    setPendingAction(null);
    setSelectedPerm(null);
    setPassword("");
  };

  /**
   * Reload the full permissions list from the gateway.
   * Used after a grant or revoke operation, when the student has
   * just provided the password.
   */
  const refreshPermissions = async (id: string, password: string) => {
    if (!sca) return;
    setLoading(true);
    setError(null);
    try {
      const permissions = await getPermissions(sca, id, password);
      const mapped = mapPermissionsToStatuses(permissions);
      setPerms(mapped);
    } catch (e: any) {
      setError(e.message || "Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Execute the selected action (grant or revoke) once the user has
   * confirmed with their password in the modal.
   */
  const confirmAction = async () => {
    if (!sca || !id || !pendingAction || !password) return;
    setSubmitting(true);
    setError(null);

    try {
      if (!selectedPerm) {
        throw new Error("No permission selected");
      }

      const targetUni = selectedPerm.universitySmartAccount;

      if (pendingAction === "revoke") {
        await revokePermission(sca, id, password, targetUni);
      } else if (pendingAction === "grant-read") {
        await grantPermission(sca, id, password, "read", targetUni);
      } else {
        await grantPermission(sca, id, password, "write", targetUni);
      }

      // After changing something, reload the full list from the chain
      await refreshPermissions(id, password);
      closeModal();
    } catch (e: any) {
      setError(e.message || "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  // If there is no authenticated student context, show a simple message
  if (!sca || !id) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>You must log in first.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Permissions</Text>

      {loading && <ActivityIndicator />}

      {error && <Text style={styles.error}>{error}</Text>}

      {perms.length === 0 && !loading && !error && (
        <Text style={styles.mutedLabel}>
          No permissions or requests found for this student.
        </Text>
      )}

      <ScrollView style={{ marginTop: 8 }}>
        {perms.map((perm) => {
          // Contract semantics: write implies read
          const effectiveRead = perm.read || perm.write;
          const effectiveWrite = perm.write;

          const hasPermission = effectiveRead || effectiveWrite;
          const hasReadRequest = perm.readRequested && !effectiveRead;
          const hasWriteRequest = perm.writeRequested && !effectiveWrite;

          // Prefer human readable university name, then shortName, then address
          const universityLabel =
            perm.universityName ||
            perm.universityShortName ||
            perm.universitySmartAccount
              ? perm.universityName && perm.universityShortName
                ? `${perm.universityName} (${perm.universityShortName})`
                : perm.universityShortName ||
                  perm.universityName ||
                  perm.universitySmartAccount
              : "Unknown / N/A";

          const smartAccountLabel =
            perm.universitySmartAccount || "Unknown / N/A";
          const countryLabel = perm.universityCountry || null;

          return (
            <View style={styles.card} key={perm.universitySmartAccount}>
              <Text style={styles.cardTitle}>{universityLabel}</Text>
              <Text style={styles.mutedLabel}>
                Smart account: {smartAccountLabel}
              </Text>
              {countryLabel && (
                <Text style={styles.mutedLabel}>Country: {countryLabel}</Text>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Current access</Text>
                <Text style={styles.row}>
                  Read access:{" "}
                  <Text style={styles.value}>
                    {effectiveRead ? "Yes" : "No"}
                  </Text>
                </Text>
                <Text style={styles.row}>
                  Write access:{" "}
                  <Text style={styles.value}>
                    {effectiveWrite ? "Yes" : "No"}
                  </Text>
                </Text>
              </View>

              {/* Requests section only if there is a request */}
              {(hasReadRequest || hasWriteRequest) && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Requests</Text>
                  {hasReadRequest && (
                    <Text style={styles.row}>
                      Read request: <Text style={styles.value}>Pending</Text>
                    </Text>
                  )}
                  {hasWriteRequest && (
                    <Text style={styles.row}>
                      Write request: <Text style={styles.value}>Pending</Text>
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.buttons}>
                {hasPermission && (
                  <View style={styles.buttonWrapper}>
                    <Button
                      title="Revoke access"
                      color="#ff6b6b"
                      onPress={() => openModal("revoke", perm)}
                    />
                  </View>
                )}

                {hasReadRequest && (
                  <View style={styles.buttonWrapper}>
                    <Button
                      title="Accept read request"
                      onPress={() => openModal("grant-read", perm)}
                    />
                  </View>
                )}

                {hasWriteRequest && (
                  <View style={styles.buttonWrapper}>
                    <Button
                      title="Accept write request"
                      onPress={() => openModal("grant-write", perm)}
                    />
                  </View>
                )}

                {!hasPermission && !hasReadRequest && !hasWriteRequest && (
                  <Text style={styles.mutedLabel}>
                    There are no permissions or pending requests for this
                    university.
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Password modal, shown only when the student wants to change permissions */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm with password</Text>
            <Text style={styles.modalText}>
              Please enter your password to continue.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Password"
              placeholderTextColor="#777"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <View style={styles.modalButtonsRow}>
              <Pressable
                style={styles.modalButton}
                onPress={closeModal}
                disabled={submitting}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={confirmAction}
                disabled={submitting || !password}
              >
                <Text style={styles.modalButtonPrimaryText}>
                  {submitting ? "Working..." : "Confirm"}
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
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 16,
  },
  error: {
    color: "#ff6b6b",
  },
  mutedLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  card: {
    backgroundColor: "#1a1d23",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 4,
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 4,
  },
  row: {
    fontSize: 13,
    color: "#ddd",
    marginBottom: 2,
  },
  value: {
    fontWeight: "600",
  },
  buttons: {
    marginTop: 16,
  },
  buttonWrapper: {
    marginBottom: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "85%",
    backgroundColor: "#1a1d23",
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 8,
  },
  modalText: {
    fontSize: 13,
    color: "#ccc",
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
    color: "#ffffff",
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalButtonText: {
    color: "#ccc",
  },
  modalButtonPrimary: {
    backgroundColor: "#3b3ff0",
    borderRadius: 8,
  },
  modalButtonPrimaryText: {
    color: "#fff",
    fontWeight: "600",
  },
});
