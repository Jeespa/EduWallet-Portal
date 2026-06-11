export type PortalPermissionLevel = "admin" | "requester" | "verifier" | "issuer";

export type Organization = {
  id: string;
  name: string;
  organizationNumber: string;
};

export type PortalUser = {
  id: string;
  name: string;
  email: string;
  permissionLevel: PortalPermissionLevel;
  organizationId: string;
};

export type AuthSession = {
  token: string;
  user: PortalUser;
  organization: Organization;
};
