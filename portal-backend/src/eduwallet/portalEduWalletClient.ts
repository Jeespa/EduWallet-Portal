// portal-backend/src/eduwallet/portalEduWalletClient.ts

import { Wallet as PortalWallet } from "ethers";
import { prisma } from "../lib/prisma";

import {
  askForPermission,
  enrollStudent,
  evaluateStudent,
  getStudentWithResult,
  PermissionType,
  verifyPermission,
  type CourseInfo,
  type Evaluation,
} from "eduwallet-sdk";

type EduWalletSdkWallet = Parameters<typeof askForPermission>[0];

export type OnChainPermissionStatus = "none" | "read" | "write";

function parseWalletMap(): Record<string, string> {
  const raw = process.env.EDUWALLET_ORG_PRIVATE_KEYS;

  if (!raw) {
    throw new Error(
      "Missing EDUWALLET_ORG_PRIVATE_KEYS. Add organization private keys to portal-backend/.env.",
    );
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("EDUWALLET_ORG_PRIVATE_KEYS must be valid JSON.");
  }
}

async function getOrganizationWallet(
  organizationId: string,
): Promise<EduWalletSdkWallet> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    throw new Error("Organization not found.");
  }

  const walletMap = parseWalletMap();
  const privateKey = walletMap[organization.organizationNumber];

  if (!privateKey) {
    throw new Error(
      `No EduWallet private key configured for organization number ${organization.organizationNumber}.`,
    );
  }

  const portalWallet = new PortalWallet(privateKey);

  // The SDK and portal-backend currently resolve ethers from two different node_modules folders.
  // At runtime this is still an ethers Wallet, but TypeScript treats them as incompatible.
  return portalWallet as unknown as EduWalletSdkWallet;
}

export async function requestOnChainPermission(input: {
  organizationId: string;
  studentSca: string;
  permissionType: "read" | "write";
}) {
  const wallet = await getOrganizationWallet(input.organizationId);

  const permission =
    input.permissionType === "write"
      ? PermissionType.Write
      : PermissionType.Read;

  await askForPermission(wallet, input.studentSca, permission);
}

export async function getOnChainPermissionStatus(input: {
  organizationId: string;
  studentSca: string;
}): Promise<OnChainPermissionStatus> {
  const wallet = await getOrganizationWallet(input.organizationId);

  const permission = await verifyPermission(wallet, input.studentSca);

  if (permission === PermissionType.Write) return "write";
  if (permission === PermissionType.Read) return "read";

  return "none";
}

export async function readOnChainStudent(input: {
  organizationId: string;
  studentSca: string;
}) {
  const wallet = await getOrganizationWallet(input.organizationId);

  return getStudentWithResult(wallet, input.studentSca);
}

export async function submitOnChainCourseResult(input: {
  organizationId: string;
  studentSca: string;
  courseCode: string;
  courseName: string;
  degreeCourse?: string | null;
  ects: string;
  grade: string;
  evaluationDate: string;
}) {
  const wallet = await getOrganizationWallet(input.organizationId);

  const permission = await verifyPermission(wallet, input.studentSca);

  if (permission !== PermissionType.Write) {
    throw new Error(
      "Organization does not have write access for this student.",
    );
  }

  const student = await getStudentWithResult(wallet, input.studentSca);

  type EduWalletAcademicResult = {
    code: string;
    name?: string;
    grade?: string;
    evaluationDate?: string;
    ects?: number;
  };

  const results =
    (student as { results?: EduWalletAcademicResult[] }).results ?? [];

  const courseAlreadyExists = results.some(
    (result: EduWalletAcademicResult) => result.code === input.courseCode,
  );

  if (!courseAlreadyExists) {
    const course: CourseInfo = {
      code: input.courseCode,
      name: input.courseName,
      degreeCourse: input.degreeCourse ?? "Unknown degree",
      ects: Number(input.ects),
    };

    await enrollStudent(wallet, input.studentSca, [course]);
  }

  const evaluation: Evaluation = {
    code: input.courseCode,
    grade: input.grade,
    evaluationDate: input.evaluationDate,
  };

  await evaluateStudent(wallet, input.studentSca, [evaluation]);

  return getStudentWithResult(wallet, input.studentSca);
}
