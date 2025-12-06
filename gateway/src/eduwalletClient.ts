import "dotenv/config";
import { JsonRpcProvider, Wallet, Contract, id } from "ethers";
import * as eduwallet from "eduwallet-sdk";
import {
  PermissionType,
  type CourseInfo,
  type Evaluation,
  type Student,
} from "eduwallet-sdk";
import { pbkdf2Sync } from "node:crypto";
import { studentsRegisterAbi } from "./contracts/studentsRegisterAbi";
import { AccountAbstraction } from "./AccountAbstraction";

// Minimal ABI just for permission checks on the Student contract
const STUDENT_ABI = [
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function revokePermission(address university)",
];


// Same role codes as used in the thesis / original code
const roleCodes = {
  readRequest: id("READER_APPLICANT"),
  writeRequest: id("WRITER_APPLICANT"),
  read: id("READER_ROLE"),
  write: id("WRITER_ROLE"),
};

// What we'll return from getStudentPermissions
export interface PermissionStatus {
  studentSca: string;
  universitySmartAccount: string;
  universityName: string;
  universityCountry: string;
  universityShortName: string;
  read: boolean;
  write: boolean;
  readRequested: boolean;
  writeRequested: boolean;
  level: 0 | 1 | 2 | 3;
}

// ── Blockchain setup (module-level, shared by the class) ──────────────────────

const rpcUrl = process.env.RPC_URL;
const universityPrivateKey = process.env.UNIVERSITY_PRIVATE_KEY;
const studentsRegisterAddress = process.env.STUDENTS_REGISTER_ADDRESS;

if (!rpcUrl) {
  throw new Error("RPC_URL is not set in environment");
}
if (!universityPrivateKey) {
  throw new Error("UNIVERSITY_PRIVATE_KEY is not set in environment");
}
if (!studentsRegisterAddress) {
  throw new Error("STUDENTS_REGISTER_ADDRESS is not set in environment");
}

const provider = new JsonRpcProvider(rpcUrl);
const universityWallet = new Wallet(universityPrivateKey, provider);

// StudentsRegister contract via our minimal ABI
const studentsRegister = new Contract(
  studentsRegisterAddress,
  studentsRegisterAbi,
  provider
);

// Cache the university smart account so we only fetch it once
let universitySmartAccountPromise: Promise<string> | null = null;
async function getUniversitySmartAccount(): Promise<string> {
  if (!universitySmartAccountPromise) {
    universitySmartAccountPromise = (
      studentsRegister.connect(universityWallet) as any
    ).getUniversityAccount();
  }
  return universitySmartAccountPromise;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function derivePrivateKey(password: string, studentId: string): string {
  const iterations = 100000;
  const keyLength = 32;
  const derivedKey = pbkdf2Sync(
    password,
    studentId,
    iterations,
    keyLength,
    "sha256"
  ).toString("hex");
  return "0x" + derivedKey;
}

// ── Main client class ─────────────────────────────────────────────────────────

export class EduWalletClient {
  /**
   * Returns the permission status of the current university
   * on the given student's smart contract.
   */
  async getStudentPermissions(studentSca: string): Promise<PermissionStatus> {
    if (!studentSca) {
      throw new Error("studentSca is required");
    }

    const universitySmartAccount = await getUniversitySmartAccount();

    // Student contract instance (read-only)
    const studentContract = new Contract(studentSca, STUDENT_ABI, provider);

    const [read, write, readRequested, writeRequested] = await Promise.all([
      (studentContract as any).hasRole(roleCodes.read, universitySmartAccount),
      (studentContract as any).hasRole(roleCodes.write, universitySmartAccount),
      (studentContract as any).hasRole(
        roleCodes.readRequest,
        universitySmartAccount
      ),
      (studentContract as any).hasRole(
        roleCodes.writeRequest,
        universitySmartAccount
      ),
    ]);

    let level: 0 | 1 | 2 | 3 = 0;
    if (read) level = (level | 1) as 0 | 1 | 2 | 3;
    if (write) level = (level | 2) as 0 | 1 | 2 | 3;

    return {
      studentSca,
      universitySmartAccount,
      read,
      write,
      readRequested,
      writeRequested,
      level,
    };
  }

  async getStudentWithResults(studentSCA: string): Promise<Student> {
    if (!studentSCA) throw new Error("studentSCA is required");

    const student = await eduwallet.getStudentWithResult(
      universityWallet,
      studentSCA
    );

    return student;
  }

  async enrollStudent(
    studentSCA: string,
    courses: CourseInfo[]
  ): Promise<void> {
    if (!studentSCA) throw new Error("studentSCA is required");
    if (!Array.isArray(courses) || courses.length === 0) {
      throw new Error("courses array is required");
    }

    await eduwallet.enrollStudent(universityWallet, studentSCA, courses);
  }

  async evaluateStudent(
    studentSCA: string,
    evaluations: Evaluation[]
  ): Promise<void> {
    if (!studentSCA) throw new Error("studentSCA is required");
    if (!Array.isArray(evaluations) || evaluations.length === 0) {
      throw new Error("evaluations array is required");
    }

    await eduwallet.evaluateStudent(universityWallet, studentSCA, evaluations);
  }

  async verifyPermission(studentSCA: string): Promise<PermissionType | null> {
    if (!studentSCA) throw new Error("studentSCA is required");

    const permission = await eduwallet.verifyPermission(
      universityWallet,
      studentSCA
    );

    return permission; // 0=Read, 1=Write, or null
  }

  /**
   * Reconstruct the student's EOA wallet from ID + password,
   * using the same PBKDF2 scheme as createStudentWallet().
   */
  getStudentWalletFromCredentials(id: string, password: string): Wallet {
    if (!id || !password) {
      throw new Error("Both id and password are required");
    }
    const privKey = derivePrivateKey(password, id);
    return new Wallet(privKey, provider);
  }

  /**
   * Given ID + password, find the student's SCA via StudentsRegister,
   * then fetch full student data.
   */
  async loginStudent(
    id: string,
    password: string
  ): Promise<{ studentSca: string; student: Student }> {
    const studentWallet = this.getStudentWalletFromCredentials(id, password);

    console.log(
      "Derived student wallet from credentials:",
      studentWallet.address
    );

    const localStudentsRegister = new Contract(
      studentsRegisterAddress!,
      studentsRegisterAbi,
      provider
    );

    // Cast so TS knows getStudentAccount exists
    const contractAddress: string = await (
      localStudentsRegister.connect(studentWallet) as any
    ).getStudentAccount();

    if (
      !contractAddress ||
      contractAddress === "0x0000000000000000000000000000000000000000"
    ) {
      throw new Error("Student contract address not found");
    }

    const student = (await (eduwallet as any).getStudentWithResult(
      universityWallet,
      contractAddress
    )) as Student;

    return {
      studentSca: contractAddress,
      student,
    };
  }
    /**
   * Revoke this university's permission on a student's smart account,
   * by acting as the student (using ID + password).
   */
  async revokePermissionAsStudent(
    id: string,
    password: string,
    studentSCA: string
  ): Promise<void> {
    if (!id || !password) {
      throw new Error("id and password are required");
    }
    if (!studentSCA) {
      throw new Error("studentSCA is required");
    }

    // Rebuild student's EOA wallet from credentials
    const studentWallet = this.getStudentWalletFromCredentials(id, password);

    // This is the university smart account we want to revoke
    const universitySmartAccount = await getUniversitySmartAccount();

    // Student smart account (Student contract) at studentSCA
    const studentContract = new Contract(studentSCA, STUDENT_ABI, provider);

    // Account abstraction manager using student's wallet
    const aa = new AccountAbstraction(provider, studentWallet);

    // Call Student.revokePermission(universitySmartAccount) via SmartAccount.execute(...)
    const callData = studentContract.interface.encodeFunctionData(
      "revokePermission",
      [universitySmartAccount]
    );

    const userOp = await aa.createUserOp({
      sender: studentSCA,
      target: studentSCA,
      value: 0n,
      data: callData,
    });

    const tx = await aa.executeUserOps([userOp], studentWallet.address);
    const receipt = await tx.wait();
    if (receipt) {
      aa.verifyTransaction(receipt, studentContract);
    }
  }
}
