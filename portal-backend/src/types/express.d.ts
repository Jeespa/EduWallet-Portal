import "express";

export type PortalRole = "ADMIN" | "REQUESTER" | "VERIFIER" | "ISSUER";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        organizationId: string;
        role: PortalRole;
      };
    }
  }
}

export {};