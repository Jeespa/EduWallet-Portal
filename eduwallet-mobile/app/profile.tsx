// app/profile.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Modal, Pressable } from "react-native";
import { useStudent } from "../context/StudentContext";
import { router } from "expo-router";

function shortenIdentifier(value?: string | null) {
  if (!value) return "-";
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getFullName(student?: { name?: string; surname?: string } | null) {
  const parts = [student?.name, student?.surname].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "-";
}

export default function ProfileScreen() {
  const { id, sca, data, clearStudent } = useStudent();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [technicalDetailsOpen, setTechnicalDetailsOpen] = useState(false);

  const student = data?.student;
  const courseCount = student?.results?.length ?? 0;

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = () => {
    setLogoutModalVisible(false);
    clearStudent();
    router.push({ pathname: "/" });
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {!student ? (
          <View style={styles.emptyStateBox}>
            <Text style={styles.emptyStateTitle}>No student loaded</Text>
            <Text style={styles.emptyStateText}>Please log in first.</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Personal details</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{getFullName(student)}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Birth date</Text>
                <Text style={styles.infoValue}>{student.birthDate || "-"}</Text>
              </View>

              <View style={styles.infoRowLast}>
                <Text style={styles.infoLabel}>Country</Text>
                <Text style={styles.infoValue}>{student.country || "-"}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>EduWallet summary</Text>

              <View style={styles.statBox}>
                <Text style={styles.statValue}>{courseCount}</Text>
                <Text style={styles.statLabel}>
                  Registered course{courseCount === 1 ? "" : "s"}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <Pressable
                style={styles.expandHeader}
                onPress={() => setTechnicalDetailsOpen((current) => !current)}
              >
                <View style={styles.expandHeaderText}>
                  <Text style={styles.cardTitleCompact}>Technical details</Text>
                  <Text style={styles.cardDescription}>
                    Only needed for support or troubleshooting.
                  </Text>
                </View>

                <Text style={styles.expandIcon}>{technicalDetailsOpen ? "−" : "+"}</Text>
              </Pressable>

              {technicalDetailsOpen ? (
                <View style={styles.technicalContent}>
                  <View style={styles.technicalRow}>
                    <Text style={styles.infoLabel}>Student ID</Text>
                    <Text style={styles.technicalValue} numberOfLines={1}>
                      {shortenIdentifier(id)}
                    </Text>
                  </View>

                  <View style={styles.technicalRowLast}>
                    <Text style={styles.infoLabel}>EduWallet address</Text>
                    <Text style={styles.technicalValue} numberOfLines={1}>
                      {shortenIdentifier(sca)}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            <View style={styles.logoutWrapper}>
              <Pressable style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>Log out</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log out?</Text>
            <Text style={styles.modalText}>
              You will need to sign in again to access your EduWallet.
            </Text>

            <View style={styles.modalButtonRow}>
              <Pressable
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmLogout}
              >
                <Text style={styles.modalConfirmButtonText}>Log out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
    backgroundColor: "#0f1115",
    flexGrow: 1,
  },
  emptyStateBox: {
    backgroundColor: "#1a1d23",
    borderRadius: 18,
    padding: 18,
    marginTop: 12,
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
    marginBottom: 18,
  },
  cardTitleCompact: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 6,
  },
  cardDescription: {
    color: "#aaa",
    fontSize: 14,
    lineHeight: 20,
  },
  infoRow: {
    marginBottom: 18,
  },
  infoRowLast: {
    marginBottom: 0,
  },
  infoLabel: {
    color: "#aaa",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  infoValue: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  statBox: {
    backgroundColor: "#222733",
    borderRadius: 14,
    padding: 16,
  },
  statValue: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    color: "#c5cbd7",
    fontSize: 16,
    fontWeight: "600",
  },
  expandHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  expandHeaderText: {
    flex: 1,
  },
  expandIcon: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "600",
    lineHeight: 32,
  },
  technicalContent: {
    borderTopWidth: 1,
    borderTopColor: "#2b303b",
    marginTop: 18,
    paddingTop: 18,
  },
  technicalRow: {
    marginBottom: 16,
  },
  technicalRowLast: {
    marginBottom: 0,
  },
  technicalValue: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  logoutWrapper: {
    marginTop: 6,
  },
  logoutButton: {
    backgroundColor: "#ff6b6b",
    borderRadius: 6,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#1a1d23",
    borderRadius: 18,
    padding: 20,
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  modalText: {
    color: "#c5cbd7",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  modalButtonRow: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 6,
    paddingVertical: 13,
    alignItems: "center",
  },
  modalCancelButton: {
    backgroundColor: "#222733",
  },
  modalConfirmButton: {
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
});
