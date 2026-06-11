import { Contract, Wallet } from "ethers";
import { AccountAbstraction } from "../AccountAbstraction";
import { provider } from "../blockchain/provider";
import {
  PermissionGrantKind,
  ROLE_CODES,
  STUDENT_OWNER_ABI,
  STUDENT_PERMISSION_ABI,
} from "../contracts/studentContractAbis";
import type { AllPermissionsForStudent, UniversityPermissionEntry } from "../types";
import { EMPTY_UNIVERSITY_METADATA, fetchUniversitiesMeta } from "./universityMetadataService";

type PermissionAddressSets = {
  read: string[];
  write: string[];
  readRequested: string[];
  writeRequested: string[];
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function assertStudentSca(studentSca: string): void {
  if (!studentSca || !studentSca.startsWith("0x")) {
    throw new Error("Valid student smart account address is required");
  }
}

function assertTargetUniversity(targetUniversity: string | undefined): string {
  if (!targetUniversity || !targetUniversity.startsWith("0x")) {
    throw new Error("targetUniversity address is required");
  }

  return targetUniversity;
}

function isNonZeroAddress(value: string): boolean {
  return Boolean(value && value !== ZERO_ADDRESS && value.startsWith("0x"));
}

/**
 * Reads all permission role sets for a student through executeViewCall.
 */
async function readAllPermissionsAsOwner(
  studentWallet: Wallet,
  studentSca: string,
): Promise<PermissionAddressSets> {
  assertStudentSca(studentSca);

  const studentContract = new Contract(studentSca, STUDENT_OWNER_ABI, provider);
  const iface = studentContract.interface;

  const callRole = async (role: string): Promise<string[]> => {
    const calldata = iface.encodeFunctionData("getPermissions", [role]);
    const raw: string = await (studentContract as any)
      .connect(studentWallet)
      .executeViewCall(studentSca, calldata);

    const decoded = iface.decodeFunctionResult("getPermissions", raw);
    return (decoded[0] ?? []) as string[];
  };

  const [read, write, readRequested, writeRequested] = await Promise.all([
    callRole(ROLE_CODES.read),
    callRole(ROLE_CODES.write),
    callRole(ROLE_CODES.readRequest),
    callRole(ROLE_CODES.writeRequest),
  ]);

  return { read, write, readRequested, writeRequested };
}

/**
 * Returns a full multi-university permission view for a student.
 */
export async function getAllPermissionsForStudent(
  studentWallet: Wallet,
  studentSca: string,
): Promise<AllPermissionsForStudent> {
  const permissionSets = await readAllPermissionsAsOwner(studentWallet, studentSca);

  const allAddresses = Array.from(
    new Set<string>([
      ...permissionSets.read,
      ...permissionSets.write,
      ...permissionSets.readRequested,
      ...permissionSets.writeRequested,
    ]),
  ).filter(isNonZeroAddress);

  const universityMap = await fetchUniversitiesMeta(allAddresses);

  const permissions: UniversityPermissionEntry[] = allAddresses.map((address) => {
    const metadata = universityMap.get(address) ?? EMPTY_UNIVERSITY_METADATA;

    return {
      universityAddress: address,
      read: permissionSets.read.includes(address),
      write: permissionSets.write.includes(address),
      readRequested: permissionSets.readRequested.includes(address),
      writeRequested: permissionSets.writeRequested.includes(address),
      universityName: metadata.name,
      universityCountry: metadata.country,
      universityShortName: metadata.shortName,
    };
  });

  return {
    studentSca,
    permissions,
  };
}

/**
 * Grants read or update/write access to a university.
 */
export async function grantPermissionAsStudent(
  studentWallet: Wallet,
  studentSca: string,
  kind: PermissionGrantKind,
  targetUniversity: string | undefined,
): Promise<void> {
  assertStudentSca(studentSca);
  const universityAddress = assertTargetUniversity(targetUniversity);

  const studentContract = new Contract(studentSca, STUDENT_PERMISSION_ABI, provider);
  const permissionRole = kind === "write" ? ROLE_CODES.write : ROLE_CODES.read;

  const callData = studentContract.interface.encodeFunctionData("grantPermission", [
    permissionRole,
    universityAddress,
  ]);

  await executeStudentUserOperation(studentWallet, studentSca, callData);
}

/**
 * Revokes a university's current access to the student smart account.
 */
export async function revokePermissionAsStudent(
  studentWallet: Wallet,
  studentSca: string,
  targetUniversity: string | undefined,
): Promise<void> {
  assertStudentSca(studentSca);
  const universityAddress = assertTargetUniversity(targetUniversity);

  const studentContract = new Contract(studentSca, STUDENT_PERMISSION_ABI, provider);

  const callData = studentContract.interface.encodeFunctionData("revokePermission", [
    universityAddress,
  ]);

  await executeStudentUserOperation(studentWallet, studentSca, callData);
}

async function executeStudentUserOperation(
  studentWallet: Wallet,
  studentSca: string,
  callData: string,
): Promise<void> {
  const studentContract = new Contract(studentSca, STUDENT_PERMISSION_ABI, provider);

  const accountAbstraction = new AccountAbstraction(provider, studentWallet);

  const userOperation = await accountAbstraction.createUserOp({
    sender: studentSca,
    target: studentSca,
    value: 0n,
    data: callData,
  });

  const tx = await accountAbstraction.executeUserOps([userOperation], studentWallet.address);
  const receipt = await tx.wait();

  if (receipt) {
    accountAbstraction.verifyTransaction(receipt, studentContract);
  }
}
