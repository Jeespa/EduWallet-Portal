import type { Wallet } from "ethers";

export type PermissionLevel = "none" | "read" | "write";

// Registering organizations can create students and issue course results.
// Access organizations are the portal organizations used for request/verification tasks.
export type RegisteringOrganization = "ntnu" | "tbs" | "uio";
export type AccessOrganization = "ntnu" | "nordicHiring";

export type CourseSeed = {
  code: string;
  name: string;
  degreeCourse: string;
  ects: number;
  grade: string;
  evaluationDate: string;
};

export type StudentSeed = {
  name: string;
  surname: string;
  birthDate: string;
  birthPlace: string;
  country: string;
  homeInstitution: string;
  registeredBy: RegisteringOrganization;
  initialAccess?: Partial<Record<AccessOrganization, PermissionLevel>>;
  initialRequests?: Partial<Record<AccessOrganization, PermissionLevel>>;
  courses: CourseSeed[];
  testPurpose: string;
};

export type GeneratedStudent = {
  studentId: string;
  password: string;
  studentSca: string;
  ownerAddress: string;
  name: string;
  homeInstitution: string;
  registeredBy: RegisteringOrganization;
  testPurpose: string;
};

export type OrganizationWallets = {
  ntnuWallet: Wallet;
  nordicHiringWallet: Wallet;
  tbsWallet: Wallet;
  uioWallet: Wallet;
};

export type OrganizationSmartAccounts = {
  ntnuSmartAccountAddress: string;
  nordicHiringSmartAccountAddress: string;
  tbsSmartAccountAddress: string;
  uioSmartAccountAddress: string;
};
