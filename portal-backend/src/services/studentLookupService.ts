import { prisma } from "../lib/prisma";
import { studentSource } from "../students";
import { getOnChainPermissionStatus } from "../eduwallet/portalEduWalletClient";
import type {
  PermissionStatus,
  PortalStudentReference,
  StudentSearchResponse,
} from "../../../shared/portalApiTypes";

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