import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { PORTAL_COLORS as COLORS } from "../../src/constants/portalTheme";
import type { VerifyResult } from "../../src/types/portal";
import { verifyAcademicRecord } from "../../src/lib/portalBackendApi";
import { usePortalAuth } from "../../src/context/PortalAuthContext";

function shortenIdentifier(value: string) {
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function VerifyPage() {
  const { token } = usePortalAuth();

  const params = useLocalSearchParams<{
    studentId?: string;
    studentSca?: string;
    studentName?: string;
    homeInstitution?: string;
  }>();

  const [studentId, setStudentId] = useState("");
  const [studentSca, setStudentSca] = useState("");
  const [studentName, setStudentName] = useState("");
  const [homeInstitution, setHomeInstitution] = useState("");
  const [certificateCid, setCertificateCid] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (typeof params.studentId === "string" && params.studentId.trim()) {
      setStudentId(params.studentId);
    }

    if (typeof params.studentSca === "string" && params.studentSca.trim()) {
      setStudentSca(params.studentSca);
    }

    if (typeof params.studentName === "string" && params.studentName.trim()) {
      setStudentName(params.studentName);
    }

    if (
      typeof params.homeInstitution === "string" &&
      params.homeInstitution.trim()
    ) {
      setHomeInstitution(params.homeInstitution);
    }
  }, [
    params.studentId,
    params.studentSca,
    params.studentName,
    params.homeInstitution,
  ]);

  const hasSelectedStudent = Boolean(studentId || studentSca);
  const hasHumanReadableStudent = Boolean(studentName || homeInstitution);

  const handleVerify = async () => {
    setError("");
    setResult(null);

    if (!token) {
      setError("You must be logged in to verify records.");
      return;
    }

    if (!studentSca.trim()) {
      setError("Please select a student or enter an EduWallet address.");
      return;
    }

    setVerifying(true);

    try {
      const verification = await verifyAcademicRecord(token, {
        studentId: studentId.trim() || undefined,
        studentSca: studentSca.trim(),
        courseCode: courseCode.trim() || undefined,
        certificateCid: certificateCid.trim() || undefined,
      });

      setResult(verification);
    } catch (err: any) {
      setError(err?.message || "Verification failed.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Verify record</Text>
      <Text style={styles.subtitle}>
        Check whether a student record or course exists in EduWallet.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Verification input</Text>

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
          <Text style={styles.label}>Course code</Text>
          <TextInput
            value={courseCode}
            onChangeText={setCourseCode}
            placeholder="TEST1001"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Certificate CID (optional)</Text>
          <TextInput
            value={certificateCid}
            onChangeText={setCertificateCid}
            placeholder="bafy..."
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            autoCapitalize="none"
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.verifyButton, verifying && styles.verifyButtonDisabled]}
          onPress={handleVerify}
          disabled={verifying}
        >
          <Text style={styles.verifyButtonText}>
            {verifying ? "Verifying..." : "Verify"}
          </Text>
        </Pressable>
      </View>

      {result ? (
        <View style={styles.card}>
          <View style={styles.resultHeader}>
            <Text style={styles.cardTitle}>Verification result</Text>

            <View
              style={[
                styles.resultBadge,
                result.valid ? styles.resultValid : styles.resultInvalid,
              ]}
            >
              <Text style={styles.resultBadgeText}>
                {result.valid ? "Valid" : "Invalid"}
              </Text>
            </View>
          </View>

          <Text style={styles.resultMessage}>{result.message}</Text>

          {result.courseName ? (
            <View style={styles.resultBlock}>
              <Text style={styles.resultLabel}>Course</Text>
              <Text style={styles.resultValue}>{result.courseName}</Text>
            </View>
          ) : null}

          {result.courseCode ? (
            <View style={styles.resultBlock}>
              <Text style={styles.resultLabel}>Course code</Text>
              <Text style={styles.resultValue}>{result.courseCode}</Text>
            </View>
          ) : null}

          {result.degreeCourse ? (
            <View style={styles.resultBlock}>
              <Text style={styles.resultLabel}>Degree course</Text>
              <Text style={styles.resultValue}>{result.degreeCourse}</Text>
            </View>
          ) : null}

          {result.grade ? (
            <View style={styles.resultBlock}>
              <Text style={styles.resultLabel}>Grade</Text>
              <Text style={styles.resultValue}>{result.grade}</Text>
            </View>
          ) : null}

          {result.ects ? (
            <View style={styles.resultBlock}>
              <Text style={styles.resultLabel}>ECTS</Text>
              <Text style={styles.resultValue}>{result.ects}</Text>
            </View>
          ) : null}

          {result.evaluationDate ? (
            <View style={styles.resultBlock}>
              <Text style={styles.resultLabel}>Evaluation date</Text>
              <Text style={styles.resultValue}>{result.evaluationDate}</Text>
            </View>
          ) : null}

          {result.certificateCid ? (
            <View style={styles.resultBlock}>
              <Text style={styles.resultLabel}>Certificate CID</Text>
              <Text style={styles.resultValue}>{result.certificateCid}</Text>
            </View>
          ) : null}

          <View style={styles.resultBlock}>
            <Text style={styles.resultLabel}>On-chain match</Text>
            <Text style={styles.resultValue}>
              {result.onChainMatch ? "Yes" : "No"}
            </Text>
          </View>
        </View>
      ) : null}
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
  error: {
    color: COLORS.danger,
    marginBottom: 14,
    fontSize: 14,
  },
  verifyButton: {
    marginTop: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    maxWidth: 220,
  },
  verifyButtonDisabled: {
    opacity: 0.65,
  },
  verifyButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },
  resultBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  resultValid: {
    backgroundColor: "#1E5A3A",
  },
  resultInvalid: {
    backgroundColor: "#6A2A2A",
  },
  resultBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  resultMessage: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  resultBlock: {
    marginBottom: 12,
  },
  resultLabel: {
    color: COLORS.muted,
    fontSize: 13,
    marginBottom: 4,
  },
  resultValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
  },
});