/**
 * Student lookup service used by the portal backend.
 *
 * The selected StudentSource supplies searchable demo student metadata. This
 * service adds organization-specific access status from EduWallet and pending
 * request information from PostgreSQL.
 */
import { prisma } from "../lib/prisma";
import { studentSource } from "../students";
import { getOnChainPermissionStatus } from "../eduwallet/portalEduWalletClient";
import type {
  PermissionStatus,
  PortalStudentReference,
  StudentSearchResponse,
} from "../../../shared/portalApiTypes";

/**
 * Reads the newest pending portal request for a student.
 * This is only used when the organization has no current on-chain access.
 */
async function getPendingRequestStatus(input: {
  organizationId: string;
  studentSca: string;
}): Promise<PermissionStatus | null> {
  const pendingRequest = await prisma.permissionRequestLog.findFirst({
    where: {
      organizationId: input.organizationId,
      studentSca: {
        equals: input.studentSca,
        mode: "insensitive",
      },
      status: "PENDING",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!pendingRequest) {
    return null;
  }

  return pendingRequest.permissionType === "WRITE"
    ? "pending-write"
    : "pending-read";
}

/**
 * Computes the access badge shown on the Students page.
 *
 * Current on-chain access takes precedence over pending portal requests, because
 * the student may have approved a request in the mobile app after it was logged.
 */
async function getOrganizationPermissionStatus(input: {
  organizationId: string;
  studentSca: string;
}): Promise<PermissionStatus> {
  try {
    const onChainStatus = await getOnChainPermissionStatus({
      organizationId: input.organizationId,
      studentSca: input.studentSca,
    });

    if (onChainStatus === "write") {
      return "write";
    }

    if (onChainStatus === "read") {
      return "read";
    }

    const pendingStatus = await getPendingRequestStatus(input);

    return pendingStatus ?? "none";
  } catch (error) {
    console.error(
      "Failed to compute organization-specific student permission status:",
      error,
    );

    return "none";
  }
}

async function enrichStudentWithPermissionStatus(input: {
  organizationId: string;
  student: PortalStudentReference;
}): Promise<PortalStudentReference> {
  const permissionStatus = await getOrganizationPermissionStatus({
    organizationId: input.organizationId,
    studentSca: input.student.studentSca,
  });

  return {
    ...input.student,
    permissionStatus,
  };
}

/**
 * Searches portal-visible students and adds the logged-in organization
 * permission status used by the frontend buttons.
 */
export async function searchStudents(
  query: string,
  organizationId: string,
): Promise<StudentSearchResponse> {
  const students = await studentSource.search(query);

  const enrichedStudents = await Promise.all(
    students.map((student) =>
      enrichStudentWithPermissionStatus({
        organizationId,
        student,
      }),
    ),
  );

  return {
    results: enrichedStudents,
    count: enrichedStudents.length,
  };
}

/**
 * Resolves student metadata for request, verification, and issuance logs.
 */
export async function findStudentByIdOrSca(input: {
  studentId?: string | null;
  studentSca?: string | null;
}): Promise<PortalStudentReference | null> {
  return studentSource.findByIdOrSca({
    studentId: input.studentId?.trim() || undefined,
    studentSca: input.studentSca?.trim() || undefined,
  });
}
