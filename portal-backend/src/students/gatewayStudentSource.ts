import type { PortalStudentReference } from "../../../shared/portalApiTypes";
import type { FindStudentInput, StudentSource } from "./studentSource";

type GatewayStudentSourceOptions = {
  baseUrl: string;
};

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

export class GatewayStudentSource implements StudentSource {
  private readonly baseUrl: string;

  constructor(options: GatewayStudentSourceOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
  }

  async search(_query?: string): Promise<PortalStudentReference[]> {
    throw new Error(
      "GatewayStudentSource.search is not implemented yet. The current student gateway does not expose a portal-safe student search endpoint.",
    );
  }

  async findByIdOrSca(_input: FindStudentInput): Promise<PortalStudentReference | null> {
    throw new Error(
      "GatewayStudentSource.findByIdOrSca is not implemented yet. The current student gateway does not expose a portal-safe student lookup endpoint.",
    );
  }
}
