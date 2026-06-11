import type { AuthSession, Organization, PortalUser } from "../types/auth";

const ORGANIZATIONS: Organization[] = [
  {
    id: "org-ntnu",
    name: "NTNU University",
    organizationNumber: "974767880",
  },
  {
    id: "org-nordic-hiring",
    name: "Nordic Hiring AS",
    organizationNumber: "999888777",
  },
];

const USERS: Array<
  PortalUser & {
    password: string;
  }
> = [
  {
    id: "user-1",
    name: "Ingrid Hansen",
    email: "ingrid@ntnu.no",
    password: "password123",
    permissionLevel: "admin",
    organizationId: "org-ntnu",
  },
  {
    id: "user-2",
    name: "Marius Olsen",
    email: "marius@ntnu.no",
    password: "password123",
    permissionLevel: "requester",
    organizationId: "org-ntnu",
  },
  {
    id: "user-3",
    name: "Eva Berg",
    email: "eva@nordichiring.no",
    password: "password123",
    permissionLevel: "verifier",
    organizationId: "org-nordic-hiring",
  },
];

export function mockLogin(email: string, password: string): AuthSession {
  const normalizedEmail = email.trim().toLowerCase();

  const matchedUser = USERS.find(
    (user) => user.email.toLowerCase() === normalizedEmail && user.password === password,
  );

  if (!matchedUser) {
    throw new Error("Invalid email or password.");
  }

  const organization = ORGANIZATIONS.find((org) => org.id === matchedUser.organizationId);

  if (!organization) {
    throw new Error("Organization not found for this user.");
  }

  const { password: _password, ...user } = matchedUser;

  return {
    token: `mock-token-${matchedUser.id}`,
    user,
    organization,
  };
}
