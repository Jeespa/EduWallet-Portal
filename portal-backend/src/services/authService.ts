import { prisma } from "../lib/prisma";
import { verifyPassword } from "../auth/password";
import { signAuthToken } from "../auth/jwt";
import type {
  PortalMeResponse,
  PortalRole,
  PortalSessionResponse,
} from "../../../shared/portalApiTypes";

type LoginInput = {
  email: string;
  password: string;
};

type SessionInput = {
  userId: string;
  organizationId: string;
  role: PortalRole;
};

type AuthErrorResult = {
  statusCode: 401 | 403;
  error: string;
};

type LoginSuccessResult = {
  statusCode: 200;
  session: PortalSessionResponse;
};

type SessionSuccessResult = {
  statusCode: 200;
  session: PortalMeResponse;
};

export async function loginPortalUser(
  input: LoginInput
): Promise<LoginSuccessResult | AuthErrorResult> {
  const user = await prisma.portalUser.findUnique({
    where: { email: input.email.toLowerCase().trim() },
    include: {
      memberships: {
        include: {
          organization: true,
        },
      },
    },
  });

  if (!user) {
    return {
      statusCode: 401,
      error: "Invalid email or password.",
    };
  }

  const passwordOk = await verifyPassword(input.password, user.passwordHash);

  if (!passwordOk) {
    return {
      statusCode: 401,
      error: "Invalid email or password.",
    };
  }

  const membership = user.memberships[0];

  if (!membership) {
    return {
      statusCode: 403,
      error: "This user is not linked to any organization.",
    };
  }

  const token = signAuthToken({
    userId: user.id,
    organizationId: membership.organizationId,
    role: membership.role,
  });

  const session: PortalSessionResponse = {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      permissionLevel: membership.role,
      organizationId: membership.organizationId,
    },
    organization: {
      id: membership.organization.id,
      name: membership.organization.name,
      organizationNumber: membership.organization.organizationNumber,
    },
  };

  return {
    statusCode: 200,
    session,
  };
}

export async function getPortalSession(
  input: SessionInput
): Promise<SessionSuccessResult | AuthErrorResult> {
  const user = await prisma.portalUser.findUnique({
    where: { id: input.userId },
  });

  const organization = await prisma.organization.findUnique({
    where: { id: input.organizationId },
  });

  if (!user || !organization) {
    return {
      statusCode: 401,
      error: "Invalid session.",
    };
  }

  const session: PortalMeResponse = {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      permissionLevel: input.role,
      organizationId: organization.id,
    },
    organization: {
      id: organization.id,
      name: organization.name,
      organizationNumber: organization.organizationNumber,
    },
  };

  return {
    statusCode: 200,
    session,
  };
}