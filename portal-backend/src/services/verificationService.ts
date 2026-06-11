/**
 * Academic verification service for portal users.
 *
 * A verification is both an EduWallet read operation and a portal-side audit
 * log. The contracts decide whether the organization has read access. The
 * database stores the outcome shown in the portal history.
 */
import { prisma } from "../lib/prisma";
import { getOnChainPermissionStatus, readOnChainStudent } from "../eduwallet/portalEduWalletClient";
import type {
  CreateVerificationBody,
  CreateVerificationResponse,
  VerificationDto,
  VerificationListResponse,
} from "../../../shared/portalApiTypes";

type CreateAcademicVerificationInput = CreateVerificationBody & {
  organizationId: string;
  createdByUserId: string;
};

type ListVerificationsInput = {
  organizationId: string;
  q?: string;
  verificationType?: string;
};

type VerificationResult =
  | {
      statusCode: 200;
      verification: CreateVerificationResponse["verification"];
    }
  | {
      statusCode: 403 | 404;
      verification: CreateVerificationResponse["verification"];
    };

/**
 * Converts stored verification logs to the DTO used by the portal frontend.
 */
function mapVerificationDto(verification: {
  id: string;
  verificationType: { toLowerCase(): string };
  studentId: string | null;
  studentSca: string;
  certificateCid: string | null;
  courseCode: string | null;
  valid: boolean;
  message: string;
  createdAt: Date;
}): VerificationDto {
  return {
    id: verification.id,
    verificationType: verification.verificationType.toLowerCase(),
    studentId: verification.studentId,
    studentSca: verification.studentSca,
    certificateCid: verification.certificateCid,
    courseCode: verification.courseCode,
    valid: verification.valid,
    message: verification.message,
    createdAt: verification.createdAt,
  };
}

/**
 * Verifies that an organization can read a student record and optionally that
 * a specific course exists in that record. Failed checks are logged too, so the
 * portal history reflects both successful and denied verification attempts.
 */
export async function createAcademicVerification(
  input: CreateAcademicVerificationInput,
): Promise<VerificationResult> {
  // The portal does not trust its own request logs for verification. It checks
  // the current contract state before reading any academic data.
  const permission = await getOnChainPermissionStatus({
    organizationId: input.organizationId,
    studentSca: input.studentSca,
  });

  if (permission !== "read" && permission !== "write") {
    const log = await prisma.verificationLog.create({
      data: {
        verificationType: "ACADEMIC",
        studentId: input.studentId || null,
        studentSca: input.studentSca,
        certificateCid: input.certificateCid || null,
        courseCode: input.courseCode || null,
        valid: false,
        message: "Organization does not have read access for this student.",
        organizationId: input.organizationId,
        createdByUserId: input.createdByUserId,
      },
    });

    return {
      statusCode: 403,
      verification: {
        id: log.id,
        valid: false,
        message: log.message,
        studentId: input.studentId || null,
        studentSca: input.studentSca,
        courseCode: input.courseCode || null,
        certificateCid: input.certificateCid || null,
      },
    };
  }

  let student;
  try {
    student = await readOnChainStudent({
      organizationId: input.organizationId,
      studentSca: input.studentSca,
    });
  } catch (error) {
    console.error("Failed to read student record from EduWallet:", error);
    const log = await prisma.verificationLog.create({
      data: {
        verificationType: "ACADEMIC",
        studentId: input.studentId || null,
        studentSca: input.studentSca,
        certificateCid: input.certificateCid || null,
        courseCode: input.courseCode || null,
        valid: false,
        message: "Could not read student record from EduWallet.",
        organizationId: input.organizationId,
        createdByUserId: input.createdByUserId,
      },
    });

    return {
      statusCode: 404,
      verification: {
        id: log.id,
        valid: false,
        message: log.message,
        studentId: input.studentId || null,
        studentSca: input.studentSca,
        courseCode: input.courseCode || null,
        certificateCid: input.certificateCid || null,
      },
    };
  }

  const requestedCourseCode = input.courseCode?.trim();

  type EduWalletAcademicResult = {
    code: string;
    name?: string;
    degreeCourse?: string;
    ects?: number | string;
    grade?: string;
    evaluationDate?: string;
    date?: string;
    certificateHash?: string;
    certificateCid?: string;
  };

  const results = (student as { results?: EduWalletAcademicResult[] }).results ?? [];

  // The prototype verifies course existence by matching course code in the
  // student's on-chain result list. Certificate CID matching can be added later.
  const matchingCourse = requestedCourseCode
    ? results.find(
        (result: EduWalletAcademicResult) =>
          result.code.toLowerCase() === requestedCourseCode.toLowerCase(),
      )
    : undefined;

  const valid = requestedCourseCode ? Boolean(matchingCourse) : true;

  const message = requestedCourseCode
    ? valid
      ? `Course ${requestedCourseCode} was found in the student's EduWallet record.`
      : `Course ${requestedCourseCode} was not found in the student's EduWallet record.`
    : "Student academic record was read successfully from EduWallet.";

  const log = await prisma.verificationLog.create({
    data: {
      verificationType: "ACADEMIC",
      studentId: input.studentId || null,
      studentSca: input.studentSca,
      certificateCid: input.certificateCid || null,
      courseCode: input.courseCode || null,
      valid,
      message,
      organizationId: input.organizationId,
      createdByUserId: input.createdByUserId,
    },
  });

  return {
    statusCode: 200,
    verification: {
      id: log.id,
      valid,
      message,
      studentId: input.studentId || null,
      studentSca: input.studentSca,
      courseCode: input.courseCode || null,
      certificateCid: input.certificateCid || null,

      course: matchingCourse
        ? {
            code: matchingCourse.code,
            name: matchingCourse.name,
            degreeCourse: matchingCourse.degreeCourse,
            ects: matchingCourse.ects,
            grade: matchingCourse.grade,
            evaluationDate: matchingCourse.evaluationDate ?? matchingCourse.date ?? null,
            certificateHash:
              matchingCourse.certificateHash ?? matchingCourse.certificateCid ?? null,
          }
        : null,
    },
  };
}

/**
 * Lists verification history for the logged-in organization only.
 */
export async function listVerifications(
  input: ListVerificationsInput,
): Promise<VerificationListResponse> {
  const q = (input.q ?? "").trim();
  const verificationType = (input.verificationType ?? "").trim().toUpperCase();

  const verifications = await prisma.verificationLog.findMany({
    where: {
      organizationId: input.organizationId,
      ...(verificationType && ["ACADEMIC", "IDENTITY"].includes(verificationType)
        ? { verificationType: verificationType as "ACADEMIC" | "IDENTITY" }
        : {}),
      ...(q
        ? {
            OR: [
              { studentId: { contains: q, mode: "insensitive" } },
              { studentSca: { contains: q, mode: "insensitive" } },
              { message: { contains: q, mode: "insensitive" } },
              { courseCode: { contains: q, mode: "insensitive" } },
              { certificateCid: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    verifications: verifications.map(mapVerificationDto),
    count: verifications.length,
  };
}
