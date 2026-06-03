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

type StoredPermissionRequest = {
  id: string;
  studentId: string | null;
  studentSca: string;
  permissionType: { toLowerCase(): string };
  status: { toLowerCase(): string };
  reason: string;
  createdAt: Date;
};

function normalizeSearchValue(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

async function mapPermissionRequestDto(
  request: StoredPermissionRequest,
  statusOverride?: "pending" | "approved" | "rejected",
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
    status: statusOverride ?? request.status.toLowerCase(),
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

  return searchableValues.some((value) =>
    normalizeSearchValue(value).includes(query),
  );
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

  return mapPermissionRequestDto(created);
}

export async function listPermissionRequests(
  input: ListRequestsInput,
): Promise<PermissionRequestListResponse> {
  const q = normalizeSearchValue(input.q);
  const status = (input.status ?? "").trim().toUpperCase();
  const permissionType = (input.permissionType ?? "").trim().toUpperCase();

  const requests = await prisma.permissionRequestLog.findMany({
    where: {
      organizationId: input.organizationId,
      ...(status && ["PENDING", "APPROVED", "REJECTED"].includes(status)
        ? { status: status as "PENDING" | "APPROVED" | "REJECTED" }
        : {}),
      ...(permissionType && ["READ", "WRITE"].includes(permissionType)
        ? { permissionType: permissionType as "READ" | "WRITE" }
        : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const requestDtos = await Promise.all(
    requests.map(async (request) => {
      let computedStatus = request.status.toLowerCase() as
        | "pending"
        | "approved"
        | "rejected";

      if (computedStatus === "pending") {
        try {
          const permission = await getOnChainPermissionStatus({
            organizationId: input.organizationId,
            studentSca: request.studentSca,
          });

          if (
            request.permissionType === "READ" &&
            (permission === "read" || permission === "write")
          ) {
            computedStatus = "approved";
          }

          if (request.permissionType === "WRITE" && permission === "write") {
            computedStatus = "approved";
          }
        } catch (error) {
          console.warn(
            `Could not sync request ${request.id} with EduWallet. Keeping stored status.`,
          );
        }
      }

      return mapPermissionRequestDto(request, computedStatus);
    }),
  );

  const filteredDtos = requestDtos.filter((request) =>
    requestMatchesQuery(request, q),
  );

  return {
    requests: filteredDtos,
    count: filteredDtos.length,
  };
}
