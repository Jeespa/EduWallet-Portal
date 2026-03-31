import type { PermissionType, PortalRequest } from "../types/portal";

export const MOCK_REQUESTS: PortalRequest[] = [
  {
    id: "req-1",
    studentSca: "0x7A1B2C3D4E5F6789012345678901234567890ABC",
    requesterOrgName: "NTNU University",
    permissionType: "write",
    reason: "Requesting permission to register a new course evaluation.",
    status: "pending",
    createdAt: "2026-04-10",
  },
  {
    id: "req-2",
    studentSca: "0x1234567890ABCDEF1234567890ABCDEF12345678",
    requesterOrgName: "Nordic Hiring AS",
    permissionType: "read",
    reason: "Requesting access to verify grades and certificates.",
    status: "approved",
    createdAt: "2026-04-08",
  },
];

export function createMockRequest(input: {
  studentSca: string;
  requesterOrgName: string;
  permissionType: PermissionType;
  reason: string;
}): PortalRequest {
  return {
    id: `req-${Date.now()}`,
    studentSca: input.studentSca,
    requesterOrgName: input.requesterOrgName,
    permissionType: input.permissionType,
    reason: input.reason,
    status: "pending",
    createdAt: new Date().toISOString().slice(0, 10),
  };
}