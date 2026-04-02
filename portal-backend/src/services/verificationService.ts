import { prisma } from "../lib/prisma";
import { studentSource } from "../students";
import { canReadStudent } from "./accessService";
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
      statusCode: 404;
      verification: CreateVerificationResponse["verification"];
    };

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

export async function createAcademicVerification(
  input: CreateAcademicVerificationInput
): Promise<VerificationResult> {
  const matchedStudent = await studentSource.findByIdOrSca({
    studentId: input.studentId,
    studentSca: input.studentSca,
  });

  if (!matchedStudent) {
    const log = await prisma.verificationLog.create({
      data: {
        verificationType: "ACADEMIC",
        studentId: input.studentId || null,
        studentSca: input.studentSca,
        certificateCid: input.certificateCid || null,
        courseCode: input.courseCode || null,
        valid: false,
        message: "Student not found.",
        organizationId: input.organizationId,
        createdByUserId: input.createdByUserId,
      },
    });

    return {
      statusCode: 404,
      verification: {
        id: log.id,
        valid: false,
        message: "Student not found.",
      },
    };
  }

  const valid = canReadStudent(matchedStudent);
  const message = valid
    ? "Verification completed successfully."
    : "Organization does not have read access for this student.";

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
      studentId: matchedStudent.studentId,
      studentSca: matchedStudent.studentSca,
      courseCode: input.courseCode || null,
      certificateCid: input.certificateCid || null,
    },
  };
}

export async function listVerifications(
  input: ListVerificationsInput
): Promise<VerificationListResponse> {
  const q = (input.q ?? "").trim();
  const verificationType = (input.verificationType ?? "").trim().toUpperCase();

  const verifications = await prisma.verificationLog.findMany({
    where: {
      organizationId: input.organizationId,
      ...(verificationType &&
      ["ACADEMIC", "IDENTITY"].includes(verificationType)
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