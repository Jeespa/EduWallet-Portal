import type {
  CreateIssuanceDraftBody,
  CreateIssuanceDraftResponse,
  CreatePermissionRequestBody,
  CreatePermissionRequestResponse,
  CreateVerificationBody,
  CreateVerificationResponse,
  ErrorResponse,
  IssuanceDraftListResponse,
  PermissionRequestListResponse,
  PortalMeResponse,
  PortalSessionResponse,
  StudentSearchResponse,
  SubmitIssuanceDraftResponse,
  VerificationListResponse,
} from "./portalApiTypes";

type RequestListParams = {
  q?: string;
  status?: string;
  permissionType?: string;
};

type VerificationListParams = {
  q?: string;
  verificationType?: string;
};

type IssuanceDraftListParams = {
  q?: string;
  status?: string;
};

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | ErrorResponse
    | T
    | null;

  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data as T;
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function buildUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string | undefined>
) {
  const url = new URL(`${baseUrl}${path}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value && value.trim()) {
        url.searchParams.set(key, value);
      }
    }
  }

  return url.toString();
}

export function createPortalClient(baseUrl: string) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  const buildHeaders = (token?: string) => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  return {
    async login(
      email: string,
      password: string
    ): Promise<PortalSessionResponse> {
      const response = await fetch(`${normalizedBaseUrl}/auth/login`, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify({ email, password }),
      });

      return parseJsonOrThrow<PortalSessionResponse>(response);
    },

    async me(token: string): Promise<PortalMeResponse> {
      const response = await fetch(`${normalizedBaseUrl}/auth/me`, {
        method: "GET",
        headers: buildHeaders(token),
      });

      return parseJsonOrThrow<PortalMeResponse>(response);
    },

    async searchStudents(
      token: string,
      q?: string
    ): Promise<StudentSearchResponse> {
      const response = await fetch(
        buildUrl(normalizedBaseUrl, "/students/search", { q }),
        {
          method: "GET",
          headers: buildHeaders(token),
        }
      );

      return parseJsonOrThrow<StudentSearchResponse>(response);
    },

    async createRequest(
      token: string,
      body: CreatePermissionRequestBody
    ): Promise<CreatePermissionRequestResponse> {
      const response = await fetch(`${normalizedBaseUrl}/requests`, {
        method: "POST",
        headers: buildHeaders(token),
        body: JSON.stringify(body),
      });

      return parseJsonOrThrow<CreatePermissionRequestResponse>(response);
    },

    async listRequests(
      token: string,
      params?: RequestListParams
    ): Promise<PermissionRequestListResponse> {
      const response = await fetch(
        buildUrl(normalizedBaseUrl, "/requests", {
          q: params?.q,
          status: params?.status,
          permissionType: params?.permissionType,
        }),
        {
          method: "GET",
          headers: buildHeaders(token),
        }
      );

      return parseJsonOrThrow<PermissionRequestListResponse>(response);
    },

    async verify(
      token: string,
      body: CreateVerificationBody
    ): Promise<CreateVerificationResponse> {
      const response = await fetch(`${normalizedBaseUrl}/verifications`, {
        method: "POST",
        headers: buildHeaders(token),
        body: JSON.stringify(body),
      });

      return parseJsonOrThrow<CreateVerificationResponse>(response);
    },

    async listVerifications(
      token: string,
      params?: VerificationListParams
    ): Promise<VerificationListResponse> {
      const response = await fetch(
        buildUrl(normalizedBaseUrl, "/verifications", {
          q: params?.q,
          verificationType: params?.verificationType,
        }),
        {
          method: "GET",
          headers: buildHeaders(token),
        }
      );

      return parseJsonOrThrow<VerificationListResponse>(response);
    },

    async createIssuanceDraft(
      token: string,
      body: CreateIssuanceDraftBody
    ): Promise<CreateIssuanceDraftResponse> {
      const response = await fetch(`${normalizedBaseUrl}/issue/drafts`, {
        method: "POST",
        headers: buildHeaders(token),
        body: JSON.stringify(body),
      });

      return parseJsonOrThrow<CreateIssuanceDraftResponse>(response);
    },

    async listIssuanceDrafts(
      token: string,
      params?: IssuanceDraftListParams
    ): Promise<IssuanceDraftListResponse> {
      const response = await fetch(
        buildUrl(normalizedBaseUrl, "/issue/drafts", {
          q: params?.q,
          status: params?.status,
        }),
        {
          method: "GET",
          headers: buildHeaders(token),
        }
      );

      return parseJsonOrThrow<IssuanceDraftListResponse>(response);
    },

    async submitIssuanceDraft(
      token: string,
      draftId: string
    ): Promise<SubmitIssuanceDraftResponse> {
      const response = await fetch(
        `${normalizedBaseUrl}/issue/drafts/${draftId}/submit`,
        {
          method: "POST",
          headers: buildHeaders(token),
        }
      );

      return parseJsonOrThrow<SubmitIssuanceDraftResponse>(response);
    },
  };
}