import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { PORTAL_COLORS as COLORS } from "../constants/portalTheme";
import { usePortalAuth } from "../context/PortalAuthContext";
import { MOCK_STUDENT_REFERENCES } from "../lib/mockPortalStudents";

export default function IssuePage() {
  const { user, organization } = usePortalAuth();

  const params = useLocalSearchParams<{
    studentId?: string;
    studentSca?: string;
  }>();

  const [studentId, setStudentId] = useState("");
  const [studentSca, setStudentSca] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [degreeCourse, setDegreeCourse] = useState("");
  const [ects, setEcts] = useState("");
  const [grade, setGrade] = useState("");
  const [evaluationDate, setEvaluationDate] = useState("");
  const [certificateCid, setCertificateCid] = useState("");
  const [error, setError] = useState("");
  const [draftCreated, setDraftCreated] = useState(false);

  useEffect(() => {
    if (typeof params.studentId === "string" && params.studentId.trim()) {
      setStudentId(params.studentId);
    }

    if (typeof params.studentSca === "string" && params.studentSca.trim()) {
      setStudentSca(params.studentSca);
    }
  }, [params.studentId, params.studentSca]);

  const selectedStudent = useMemo(() => {
    return MOCK_STUDENT_REFERENCES.find((student) => {
      const studentIdMatches =
        !!studentId.trim() && student.studentId === studentId.trim();

      const studentScaMatches =
        !!studentSca.trim() &&
        student.studentSca.toLowerCase() === studentSca.trim().toLowerCase();

      return studentIdMatches || studentScaMatches;
    });
  }, [studentId, studentSca]);

  const hasWriteAccessForStudent =
    selectedStudent?.permissionStatus === "write";

  const canIssue =
    (user?.permissionLevel === "admin" || user?.permissionLevel === "issuer") &&
    hasWriteAccessForStudent;

  const draftReady = useMemo(() => {
    return (
      !!studentId.trim() &&
      !!studentSca.trim() &&
      !!courseCode.trim() &&
      !!courseName.trim() &&
      !!ects.trim() &&
      !!grade.trim() &&
      !!evaluationDate.trim()
    );
  }, [
    studentId,
    studentSca,
    courseCode,
    courseName,
    ects,
    grade,
    evaluationDate,
  ]);

  const handleCreateDraft = () => {
    setError("");
    setDraftCreated(false);

    if (
      user?.permissionLevel !== "admin" &&
      user?.permissionLevel !== "issuer"
    ) {
      setError(
        "Your account does not currently have permission to issue results.",
      );
      return;
    }

    if (!selectedStudent) {
      setError(
        "Selected student could not be found in the current portal data.",
      );
      return;
    }

    if (selectedStudent.permissionStatus !== "write") {
      setError(
        "This organization does not currently have write access for the selected student.",
      );
      return;
    }

    if (!studentId.trim()) {
      setError("Please enter the student ID.");
      return;
    }

    if (!studentSca.trim()) {
      setError("Please enter the student smart-account address.");
      return;
    }

    if (!courseCode.trim()) {
      setError("Please enter the course code.");
      return;
    }

    if (!courseName.trim()) {
      setError("Please enter the course name.");
      return;
    }

    if (!ects.trim()) {
      setError("Please enter the ECTS value.");
      return;
    }

    if (!grade.trim()) {
      setError("Please enter the grade.");
      return;
    }

    if (!evaluationDate.trim()) {
      setError("Please enter the evaluation date.");
      return;
    }

    setDraftCreated(true);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Issue</Text>
      <Text style={styles.subtitle}>
        Prepare new academic result entries for issuance to an existing
        EduWallet student.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Issuance context</Text>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Organization</Text>
          <Text style={styles.value}>{organization?.name || "-"}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Signed-in user</Text>
          <Text style={styles.value}>{user?.name || "-"}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Permission level</Text>
          <Text style={styles.value}>{user?.permissionLevel || "-"}</Text>
        </View>

        <View
          style={[
            styles.statusBox,
            canIssue ? styles.statusAllowed : styles.statusRestricted,
          ]}
        >
          <Text style={styles.statusTitle}>
            {canIssue ? "Issuance enabled" : "Issuance restricted"}
          </Text>
          <Text style={styles.statusText}>
            {canIssue
              ? "This account can prepare issuance drafts for the selected student. On-chain submission is still pending backend integration."
              : "Issuance requires both an issuer/admin account and write access for the selected student."}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Draft academic result</Text>

        {studentId || studentSca ? (
          <View style={styles.selectedStudentBox}>
            <Text style={styles.selectedStudentTitle}>Selected student</Text>

            {studentId ? (
              <Text style={styles.selectedStudentText}>
                Student ID: {studentId}
              </Text>
            ) : null}

            {studentSca ? (
              <Text style={styles.selectedStudentText}>
                Smart-account: {studentSca}
              </Text>
            ) : null}

            <Text style={styles.selectedStudentText}>
              Current access:{" "}
              {selectedStudent?.permissionStatus
                ? selectedStudent.permissionStatus
                : "unknown"}
            </Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Student ID</Text>
          <TextInput
            value={studentId}
            onChangeText={setStudentId}
            placeholder="s123456"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Student smart-account address</Text>
          <TextInput
            value={studentSca}
            onChangeText={setStudentSca}
            placeholder="0x..."
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Course code</Text>
            <TextInput
              value={courseCode}
              onChangeText={setCourseCode}
              placeholder="IDATT2104"
              placeholderTextColor={COLORS.muted}
              style={styles.input}
              autoCapitalize="characters"
            />
          </View>

          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Grade</Text>
            <TextInput
              value={grade}
              onChangeText={setGrade}
              placeholder="A"
              placeholderTextColor={COLORS.muted}
              style={styles.input}
              autoCapitalize="characters"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Course name</Text>
          <TextInput
            value={courseName}
            onChangeText={setCourseName}
            placeholder="Distributed Systems"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Degree course (optional)</Text>
          <TextInput
            value={degreeCourse}
            onChangeText={setDegreeCourse}
            placeholder="Computer Science"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>ECTS</Text>
            <TextInput
              value={ects}
              onChangeText={setEcts}
              placeholder="7.5"
              placeholderTextColor={COLORS.muted}
              style={styles.input}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Evaluation date</Text>
            <TextInput
              value={evaluationDate}
              onChangeText={setEvaluationDate}
              placeholder="2026-05-20"
              placeholderTextColor={COLORS.muted}
              style={styles.input}
              autoCapitalize="none"
            />
          </View>
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

        {draftCreated ? (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>Draft created</Text>
            <Text style={styles.successText}>
              The issuance draft has been prepared locally. The final submission
              to the backend/on-chain flow is not yet connected.
            </Text>
          </View>
        ) : null}

        <Pressable
          style={[
            styles.createButton,
            !canIssue && styles.createButtonDisabled,
          ]}
          onPress={handleCreateDraft}
        >
          <Text style={styles.createButtonText}>Create draft issuance</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Draft preview</Text>

        {draftReady ? (
          <>
            <View style={styles.infoBlock}>
              <Text style={styles.label}>Student ID</Text>
              <Text style={styles.value}>{studentId}</Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>Student smart-account</Text>
              <Text style={styles.value}>{studentSca}</Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>Issuer</Text>
              <Text style={styles.value}>{organization?.name || "-"}</Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>Course</Text>
              <Text style={styles.value}>
                {courseCode} — {courseName}
              </Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>Degree course</Text>
              <Text style={styles.value}>{degreeCourse || "-"}</Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>ECTS</Text>
              <Text style={styles.value}>{ects}</Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>Grade</Text>
              <Text style={styles.value}>{grade}</Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>Evaluation date</Text>
              <Text style={styles.value}>{evaluationDate}</Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.label}>Certificate CID</Text>
              <Text style={styles.value}>{certificateCid || "-"}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.emptyText}>
            Fill out the required fields to preview the draft issuance record.
          </Text>
        )}
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
  inputGroup: {
    marginBottom: 18,
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
  row: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  halfWidth: {
    flex: 1,
    minWidth: 220,
  },
  statusBox: {
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  statusAllowed: {
    backgroundColor: "#1E5A3A",
  },
  statusRestricted: {
    backgroundColor: "#5B4A1F",
  },
  statusTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 18,
  },
  error: {
    color: COLORS.danger,
    marginBottom: 14,
    fontSize: 14,
  },
  successBox: {
    backgroundColor: "#1E5A3A",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
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
    maxWidth: 240,
  },
  createButtonDisabled: {
    opacity: 0.65,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 15,
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
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  selectedStudentText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
