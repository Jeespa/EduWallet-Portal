export type PortalRole = "ADMIN" | "REQUESTER" | "VERIFIER" | "ISSUER";

export type PermissionStatus = "none" | "pending-read" | "pending-write" | "read" | "write";

export type PortalUserDto = {
  id: string;
  name: string;
  email: string;
  permissionLevel: PortalRole;
  organizationId: string;
};

export type OrganizationDto = {
  id: string;
  name: string;
  organizationNumber: string;
};

export type PortalSessionResponse = {
  token: string;
  user: PortalUserDto;
  organization: OrganizationDto;
};

export type PortalMeResponse = {
  user: PortalUserDto;
  organization: OrganizationDto;
};

export type PortalStudentReference = {
  studentId: string;
  studentSca: string;
  name?: string;
  homeInstitution?: string;
  permissionStatus?: PermissionStatus;
};

export type StudentSearchResponse = {
  results: PortalStudentReference[];
  count: number;
};

export type CreatePermissionRequestBody = {
  studentId?: string;
  studentSca: string;
  permissionType: "read" | "write";
  reason: string;
};

export type PermissionRequestDto = {
  id: string;
  studentId: string | null;
  studentSca: string;
  studentName?: string | null;
  homeInstitution?: string | null;
  permissionType: string;
  status: string;
  reason: string;
  createdAt: string | Date;
};

export type PermissionRequestListResponse = {
  requests: PermissionRequestDto[];
  count: number;
};

export type CreatePermissionRequestResponse = {
  request: PermissionRequestDto;
};

export type CreateVerificationBody = {
  studentId?: string;
  studentSca: string;
  certificateCid?: string;
  courseCode?: string;
};

export type VerificationDto = {
  id: string;
  verificationType?: string;
  valid: boolean;
  message: string;
  studentId?: string | null;
  studentSca?: string;
  certificateCid?: string | null;
  courseCode?: string | null;
  createdAt?: string | Date;
};

export type CreateVerificationResponse = {
  verification: VerificationDto;
};

export type VerificationListResponse = {
  verifications: VerificationDto[];
  count: number;
};

export type CreateIssuanceDraftBody = {
  studentId?: string;
  studentSca: string;
  courseCode: string;
  courseName: string;
  degreeCourse?: string;
  ects: string;
  grade: string;
  evaluationDate: string;
  certificateCid?: string;
};

export type IssuanceDraftDto = {
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
  status: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type CreateIssuanceDraftResponse = {
  draft: IssuanceDraftDto;
};

export type IssuanceDraftListResponse = {
  drafts: IssuanceDraftDto[];
  count: number;
};

export type SubmitIssuanceDraftResponse = {
  draft: {
    id: string;
    status: string;
    updatedAt: string | Date;
  };
};

export type ErrorResponse = {
  error: string;
  details?: unknown;
};
