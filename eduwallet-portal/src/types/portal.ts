export type PermissionType = "read" | "write";

export type RequestStatus = "pending" | "approved" | "rejected";

export type PortalRequest = {
  id: string;
  studentId?: string | null;
  studentSca: string;
  requesterOrgName: string;
  permissionType: PermissionType;
  reason: string;
  status: RequestStatus;
  createdAt: string;
};

export type VerifyInput = {
  studentId?: string;
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
  degreeCourse?: string;
  ects?: string | number;
  grade?: string;
  evaluationDate?: string;
  certificateCid?: string;
  onChainMatch?: boolean;
  ipfsReachable?: boolean;
};