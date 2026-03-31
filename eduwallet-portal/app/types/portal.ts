export type PermissionType = "read" | "write";

export type RequestStatus = "pending" | "approved" | "rejected";

export type PortalRequest = {
  id: string;
  studentSca: string;
  requesterOrgName: string;
  permissionType: PermissionType;
  reason: string;
  status: RequestStatus;
  createdAt: string;
};

export type VerifyInput = {
  studentSca: string;
  certificateCid?: string;
  courseCode?: string;
};

export type VerifyResult = {
  valid: boolean;
  message: string;
  issuerName?: string;
  courseName?: string;
  courseCode?: string;
  grade?: string;
  certificateCid?: string;
  onChainMatch?: boolean;
  ipfsReachable?: boolean;
};