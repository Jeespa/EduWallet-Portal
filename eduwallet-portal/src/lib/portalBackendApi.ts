import type { AuthSession } from "../types/auth";
import type { PermissionType, PortalRequest, VerifyResult } from "../types/portal";

const API_BASE_URL = process.env.EXPO_PUBLIC_PORTAL_BACKEND_BASE_URL ?? "http://localhost:4000";

async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

function normalizeSession(session: any): AuthSession {
  return {
    token: session.token,
    user: {
      ...session.user,
      permissionLevel: String(session.user.permissionLevel).toLowerCase(),
    },
    organization: session.organization,
  };
}

function normalizeRequest(request: any): PortalRequest {
  return {
    id: request.id,
    studentId: request.studentId ?? null,
    studentSca: request.studentSca,
    studentName: request.studentName ?? null,
    homeInstitution: request.homeInstitution ?? null,
    requesterOrgName: request.requesterOrgName ?? "Current organization",
    permissionType: request.permissionType,
    reason: request.reason,
    status: request.status,
    createdAt: request.createdAt,
  };
}

export async function loginPortal(email: string, password: string): Promise<AuthSession> {
  const session = await apiRequest<any>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  return normalizeSession(session);
}

export type PortalStudentReference = {
  studentId: string;
  studentSca: string;
  name?: string;
  homeInstitution?: string;
  permissionStatus?: "none" | "pending-read" | "pending-write" | "read" | "write";
};

export async function searchPortalStudents(
  token: string,
  query: string,
): Promise<PortalStudentReference[]> {
  const result = await apiRequest<{ results: PortalStudentReference[] }>(
    `/students/search?q=${encodeURIComponent(query)}`,
    {
      method: "GET",
      token,
    },
  );

  return result.results;
}

export async function createPortalPermissionRequest(
  token: string,
  input: {
    studentId?: string;
    studentSca: string;
    permissionType: PermissionType;
    reason: string;
  },
): Promise<PortalRequest> {
  const result = await apiRequest<{ request: any }>("/requests", {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });

  return normalizeRequest(result.request);
}

export async function listPortalRequests(token: string): Promise<PortalRequest[]> {
  const result = await apiRequest<{ requests: any[] }>("/requests", {
    method: "GET",
    token,
  });

  return result.requests.map(normalizeRequest);
}

export async function verifyAcademicRecord(
  token: string,
  input: {
    studentId?: string;
    studentSca: string;
    certificateCid?: string;
    courseCode?: string;
  },
): Promise<VerifyResult> {
  const result = await apiRequest<{ verification: any }>("/verifications", {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });

  return {
    valid: result.verification.valid,
    message: result.verification.message,
    courseCode:
      result.verification.course?.code ?? result.verification.courseCode ?? input.courseCode,
    courseName: result.verification.course?.name,
    degreeCourse: result.verification.course?.degreeCourse,
    ects: result.verification.course?.ects,
    grade: result.verification.course?.grade,
    evaluationDate: result.verification.course?.evaluationDate,
    certificateCid:
      result.verification.course?.certificateHash ??
      result.verification.certificateCid ??
      input.certificateCid,
    onChainMatch: result.verification.valid,
  };
}

export async function createIssuanceDraft(
  token: string,
  input: {
    studentId?: string;
    studentSca: string;
    courseCode: string;
    courseName: string;
    degreeCourse?: string;
    ects: string;
    grade: string;
    evaluationDate: string;
    certificateCid?: string;
  },
) {
  const result = await apiRequest<{ draft: any }>("/issue/drafts", {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });

  return result.draft;
}

export async function submitIssuanceDraft(token: string, draftId: string) {
  const result = await apiRequest<{ draft: any }>(`/issue/drafts/${draftId}/submit`, {
    method: "POST",
    token,
  });

  return result.draft;
}
