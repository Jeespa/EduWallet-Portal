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
import { PORTAL_COLORS as COLORS } from "../../src/constants/portalTheme";
import { usePortalAuth } from "../../src/context/PortalAuthContext";
import {
  createIssuanceDraft,
  submitIssuanceDraft,
} from "../../src/lib/portalBackendApi";

type SubmissionState =
  | {
      status: "idle";
    }
  | {
      status: "submitted";
      draftId: string;
      updatedAt?: string;
    };

function canUseIssuancePage(input: {
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

export default function IssuePage() {
  const { token, user, organization } = usePortalAuth();

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
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<SubmissionState>({
    status: "idle",
  });

  useEffect(() => {
    if (typeof params.studentId === "string" && params.studentId.trim()) {
      setStudentId(params.studentId);
    }

    if (typeof params.studentSca === "string" && params.studentSca.trim()) {
      setStudentSca(params.studentSca);
    }
  }, [params.studentId, params.studentSca]);

  const canIssue = canUseIssuancePage({
    role: user?.permissionLevel,
    organizationName: organization?.name,
    organizationNumber: organization?.organizationNumber,
  });

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

  const handleSubmitResult = async () => {
    setError("");
    setSubmission({ status: "idle" });

    if (!token) {
      setError("You must be logged in to submit academic results.");
      return;
    }

    if (!canIssue) {
      setError("Your account does not have permission to issue results.");
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

    setSubmitting(true);

    try {
      const draft = await createIssuanceDraft(token, {
        studentId: studentId.trim(),
        studentSca: studentSca.trim(),
        courseCode: courseCode.trim().toUpperCase(),
        courseName: courseName.trim(),
        degreeCourse: degreeCourse.trim() || undefined,
        ects: ects.trim(),
        grade: grade.trim().toUpperCase(),
        evaluationDate: evaluationDate.trim(),
        certificateCid: certificateCid.trim() || undefined,
      });

      const submitted = await submitIssuanceDraft(token, draft.id);

      setSubmission({
        status: "submitted",
        draftId: submitted.id ?? draft.id,
        updatedAt: submitted.updatedAt,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to submit academic result.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!canIssue) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Issue result</Text>
        <Text style={styles.subtitle}>
          Submit course results to a student’s EduWallet when write access is
          available.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Access restricted</Text>
          <Text style={styles.emptyText}>
            Your account does not have permission to issue academic results.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Issue result</Text>
      <Text style={styles.subtitle}>
        Submit a course result to the selected student’s EduWallet.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Academic result</Text>

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
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Student ID</Text>
          <TextInput
            value={studentId}
            onChangeText={setStudentId}
            placeholder="Generated student ID"
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
              placeholder="TEST1001"
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
            placeholder="Portal Integration Test"
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

        {submission.status === "submitted" ? (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>Result submitted</Text>
            <Text style={styles.successText}>
              The result was submitted through the portal backend and written to
              EduWallet. Draft ID: {submission.draftId}
            </Text>
          </View>
        ) : null}

        <Pressable
          style={[
            styles.createButton,
            submitting && styles.createButtonDisabled,
          ]}
          onPress={handleSubmitResult}
          disabled={submitting}
        >
          <Text style={styles.createButtonText}>
            {submitting ? "Submitting..." : "Create and submit result"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Result preview</Text>

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
              <Text style={styles.label}>Course</Text>
              <Text style={styles.value}>
                {courseCode.toUpperCase()} — {courseName}
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
              <Text style={styles.value}>{grade.toUpperCase()}</Text>
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
            Fill out the required fields to preview the academic result.
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
  error: {
    color: COLORS.danger,
    marginBottom: 14,
    fontSize: 14,
  },
  successBox: {
    backgroundColor: COLORS.success,
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
    maxWidth: 260,
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
    lineHeight: 22,
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