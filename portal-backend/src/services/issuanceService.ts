import { prisma } from "../lib/prisma";
import { studentSource } from "../students";
import { canWriteStudent } from "./accessService";
import { submitOnChainCourseResult } from "../eduwallet/portalEduWalletClient";
import type {
  CreateIssuanceDraftBody,
  CreateIssuanceDraftResponse,
  IssuanceDraftDto,
  IssuanceDraftListResponse,
  SubmitIssuanceDraftResponse,
} from "../../../shared/portalApiTypes";

type CreateIssuanceDraftInput = CreateIssuanceDraftBody & {
  organizationId: string;
  createdByUserId: string;
};

type ListIssuanceDraftsInput = {
  organizationId: string;
  q?: string;
  status?: string;
};

type SubmitIssuanceDraftInput = {
  draftId: string;
  organizationId: string;
};

type IssuanceErrorResult = {
  statusCode: 400 | 403 | 404;
  error: string;
};

type CreateIssuanceDraftSuccessResult = {
  statusCode: 201;
  draft: CreateIssuanceDraftResponse["draft"];
};

type SubmitIssuanceDraftSuccessResult = {
  statusCode: 200;
  draft: SubmitIssuanceDraftResponse["draft"];
};

function mapIssuanceDraftDto(draft: {
  id: string;
  studentId: string | null;
  studentSca: string;
  courseCode: string;
  courseName: string;
  degreeCourse: string | null;
  ects: string;
  grade: string;
  evaluationDate: string;
  certificateCid: string | null;
  status: { toLowerCase(): string };
  createdAt: Date;
  updatedAt: Date;
}): IssuanceDraftDto {
  return {
    id: draft.id,
    studentId: draft.studentId,
    studentSca: draft.studentSca,
    courseCode: draft.courseCode,
    courseName: draft.courseName,
    degreeCourse: draft.degreeCourse,
    ects: draft.ects,
    grade: draft.grade,
    evaluationDate: draft.evaluationDate,
    certificateCid: draft.certificateCid,
    status: draft.status.toLowerCase(),
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
}

export async function createIssuanceDraft(
  input: CreateIssuanceDraftInput
): Promise<CreateIssuanceDraftSuccessResult | IssuanceErrorResult> {
  const matchedStudent = await studentSource.findByIdOrSca({
    studentId: input.studentId,
    studentSca: input.studentSca,
  });

  if (!matchedStudent) {
    return {
      statusCode: 404,
      error: "Student not found.",
    };
  }

  if (!canWriteStudent(matchedStudent)) {
    return {
      statusCode: 403,
      error: "This organization does not have write access for the selected student.",
    };
  }

  const created = await prisma.issuanceDraft.create({
    data: {
      studentId: input.studentId || null,
      studentSca: input.studentSca,
      courseCode: input.courseCode,
      courseName: input.courseName,
      degreeCourse: input.degreeCourse || null,
      ects: input.ects,
      grade: input.grade,
      evaluationDate: input.evaluationDate,
      certificateCid: input.certificateCid || null,
      organizationId: input.organizationId,
      createdByUserId: input.createdByUserId,
    },
  });

  return {
    statusCode: 201,
    draft: {
      id: created.id,
      studentId: created.studentId,
      studentSca: created.studentSca,
      courseCode: created.courseCode,
      courseName: created.courseName,
      degreeCourse: created.degreeCourse,
      ects: created.ects,
      grade: created.grade,
      evaluationDate: created.evaluationDate,
      certificateCid: created.certificateCid,
      status: created.status.toLowerCase(),
      createdAt: created.createdAt,
    },
  };
}

export async function listIssuanceDrafts(
  input: ListIssuanceDraftsInput
): Promise<IssuanceDraftListResponse> {
  const q = (input.q ?? "").trim();
  const status = (input.status ?? "").trim().toUpperCase();

  const drafts = await prisma.issuanceDraft.findMany({
    where: {
      organizationId: input.organizationId,
      ...(status && ["DRAFT", "READY", "SUBMITTED", "FAILED"].includes(status)
        ? { status: status as "DRAFT" | "READY" | "SUBMITTED" | "FAILED" }
        : {}),
      ...(q
        ? {
            OR: [
              { studentId: { contains: q, mode: "insensitive" } },
              { studentSca: { contains: q, mode: "insensitive" } },
              { courseCode: { contains: q, mode: "insensitive" } },
              { courseName: { contains: q, mode: "insensitive" } },
              { degreeCourse: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    drafts: drafts.map(mapIssuanceDraftDto),
    count: drafts.length,
  };
}

export async function submitIssuanceDraft(input: SubmitIssuanceDraftInput) {
  const draft = await prisma.issuanceDraft.findFirst({
    where: {
      id: input.draftId,
      organizationId: input.organizationId,
    },
  });

  if (!draft) {
    return {
      statusCode: 404 as const,
      error: "Issuance draft not found.",
    };
  }

  if (draft.status !== "DRAFT") {
    return {
      statusCode: 400 as const,
      error: "Only drafts in DRAFT state can be submitted.",
    };
  }

  try {
    await submitOnChainCourseResult({
      organizationId: input.organizationId,
      studentSca: draft.studentSca,
      courseCode: draft.courseCode,
      courseName: draft.courseName,
      degreeCourse: draft.degreeCourse,
      ects: draft.ects,
      grade: draft.grade,
      evaluationDate: draft.evaluationDate,
    });

    const updated = await prisma.issuanceDraft.update({
      where: {
        id: draft.id,
      },
      data: {
        status: "SUBMITTED",
      },
    });

    return {
      statusCode: 200 as const,
      draft: {
        id: updated.id,
        status: updated.status.toLowerCase(),
        updatedAt: updated.updatedAt,
      },
    };
  } catch (error) {
    console.error("Failed to submit issuance draft to EduWallet:", error);

    await prisma.issuanceDraft.update({
      where: {
        id: draft.id,
      },
      data: {
        status: "FAILED",
      },
    });

    return {
      statusCode: 500 as const,
      error: "Failed to submit issuance draft to EduWallet.",
    };
  }
}