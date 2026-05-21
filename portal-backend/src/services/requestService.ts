import { prisma } from "../lib/prisma";
import { requestOnChainPermission } from "../eduwallet/portalEduWalletClient";
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

function mapPermissionRequestDto(request: {
  id: string;
  studentId: string | null;
  studentSca: string;
  permissionType: { toLowerCase(): string };
  status: { toLowerCase(): string };
  reason: string;
  createdAt: Date;
}): PermissionRequestDto {
  return {
    id: request.id,
    studentId: request.studentId,
    studentSca: request.studentSca,
    permissionType: request.permissionType.toLowerCase(),
    status: request.status.toLowerCase(),
    reason: request.reason,
    createdAt: request.createdAt,
  };
}

export async function createPermissionRequest(
  input: CreateRequestInput
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
  input: ListRequestsInput
): Promise<PermissionRequestListResponse> {
  const q = (input.q ?? "").trim();
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
      ...(q
        ? {
            OR: [
              { studentId: { contains: q, mode: "insensitive" } },
              { studentSca: { contains: q, mode: "insensitive" } },
              { reason: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    requests: requests.map(mapPermissionRequestDto),
    count: requests.length,
  };
}