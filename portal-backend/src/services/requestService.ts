import { prisma } from "../lib/prisma";
import { requestOnChainPermission } from "../eduwallet/portalEduWalletClient";
import { getOnChainPermissionStatus } from "../eduwallet/portalEduWalletClient";
import { findStudentByIdOrSca } from "./studentLookupService";
import type {
  CreatePermissionRequestBody,
  PermissionRequestDto,
  PermissionRequestListResponse,
} from "../../../shared/portalApiTypes";

type CreateRequestInput = CreatePermissionRequestBody & {
  organizationId: string;
  createdByUserId: string;
};

type ListRequestsInput = {
  organizationId: string;
  q?: string;
  status?: string;
  permissionType?: string;
};

type StoredPermissionType = "READ" | "WRITE";
type StoredPermissionStatus = "PENDING" | "APPROVED" | "REJECTED";

type StoredPermissionRequest = {
  id: string;
  studentId: string | null;
  studentSca: string;
  permissionType: StoredPermissionType;
  status: StoredPermissionStatus;
  reason: string;
  createdAt: Date;
};

function normalizeSearchValue(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeStatusFilter(value?: string) {
  const status = (value ?? "").trim().toUpperCase();

  if (["PENDING", "APPROVED", "REJECTED"].includes(status)) {
    return status as StoredPermissionStatus;
  }

  return null;
}

function normalizePermissionTypeFilter(value?: string) {
  const permissionType = (value ?? "").trim().toUpperCase();

  if (["READ", "WRITE"].includes(permissionType)) {
    return permissionType as StoredPermissionType;
  }

  return null;
}

function requestIsApprovedByCurrentPermission(input: {
  requestedPermissionType: StoredPermissionType;
  currentPermission: "none" | "read" | "write";
}) {
  if (input.requestedPermissionType === "READ") {
    return input.currentPermission === "read" || input.currentPermission === "write";
  }

  return input.currentPermission === "write";
}

async function mapPermissionRequestDto(
  request: StoredPermissionRequest,
): Promise<PermissionRequestDto> {
  const student = await findStudentByIdOrSca({
    studentId: request.studentId,
    studentSca: request.studentSca,
  });

  return {
    id: request.id,
    studentId: request.studentId,
    studentSca: request.studentSca,
    studentName: student?.name ?? null,
    homeInstitution: student?.homeInstitution ?? null,
    permissionType: request.permissionType.toLowerCase(),
    status: request.status.toLowerCase(),
    reason: request.reason,
    createdAt: request.createdAt,
  };
}

function requestMatchesQuery(request: PermissionRequestDto, query: string) {
  if (!query) return true;

  const searchableValues = [
    request.studentId,
    request.studentSca,
    request.studentName,
    request.homeInstitution,
    request.reason,
    String(request.createdAt),
  ];

  return searchableValues.some((value) => normalizeSearchValue(value).includes(query));
}

async function syncPendingRequestStatus(input: {
  request: StoredPermissionRequest;
  organizationId: string;
}): Promise<StoredPermissionRequest> {
  if (input.request.status !== "PENDING") {
    return input.request;
  }

  try {
    const permission = await getOnChainPermissionStatus({
      organizationId: input.organizationId,
      studentSca: input.request.studentSca,
    });

    const isApproved = requestIsApprovedByCurrentPermission({
      requestedPermissionType: input.request.permissionType,
      currentPermission: permission,
    });

    if (!isApproved) {
      return input.request;
    }

    // Important: once the student has approved a request, the request log is a
    // historical record. It should stay approved even if the student later
    // removes the current permission from the mobile app.
    const updated = await prisma.permissionRequestLog.update({
      where: {
        id: input.request.id,
      },
      data: {
        status: "APPROVED",
      },
    });

    return updated as StoredPermissionRequest;
  } catch (error) {
    console.warn(
      `Could not sync request ${input.request.id} with EduWallet. Keeping stored status.`,
    );

    return input.request;
  }
}

export async function createPermissionRequest(
  input: CreateRequestInput,
): Promise<PermissionRequestDto> {
  // 1. Submit the actual EduWallet permission request on-chain.
  await requestOnChainPermission({
    organizationId: input.organizationId,
    studentSca: input.studentSca,
    permissionType: input.permissionType,
  });

  // 2. Store portal-side log after successful blockchain submission.
  const created = await prisma.permissionRequestLog.create({
    data: {
      studentId: input.studentId || null,
      studentSca: input.studentSca,
      permissionType: input.permissionType === "read" ? "READ" : "WRITE",
      reason: input.reason,
      organizationId: input.organizationId,
      createdByUserId: input.createdByUserId,
    },
  });

  return mapPermissionRequestDto(created as StoredPermissionRequest);
}

export async function listPermissionRequests(
  input: ListRequestsInput,
): Promise<PermissionRequestListResponse> {
  const q = normalizeSearchValue(input.q);
  const statusFilter = normalizeStatusFilter(input.status);
  const permissionTypeFilter = normalizePermissionTypeFilter(input.permissionType);

  const requests = await prisma.permissionRequestLog.findMany({
    where: {
      organizationId: input.organizationId,
      ...(permissionTypeFilter ? { permissionType: permissionTypeFilter } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const syncedRequests = await Promise.all(
    requests.map((request) =>
      syncPendingRequestStatus({
        request: request as StoredPermissionRequest,
        organizationId: input.organizationId,
      }),
    ),
  );

  const requestDtos = await Promise.all(
    syncedRequests.map((request) => mapPermissionRequestDto(request)),
  );

  const filteredDtos = requestDtos.filter((request) => {
    const matchesStatus = !statusFilter || request.status.toUpperCase() === statusFilter;

    return matchesStatus && requestMatchesQuery(request, q);
  });

  return {
    requests: filteredDtos,
    count: filteredDtos.length,
  };
}
