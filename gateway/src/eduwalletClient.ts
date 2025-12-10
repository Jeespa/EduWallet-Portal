/**
 * EduWalletClient
 *
 * This module provides a high level TypeScript wrapper around the EduWallet
 * smart contracts for use by the HTTP gateway. It reconstructs the student's
 * owner wallet from ID and password, reads on chain data via the student
 * smart account, and performs permission changes via account abstraction.
 */

import {
  JsonRpcProvider,
  Wallet,
  Contract,
  id,
  isCallException,
} from "ethers";
import { pbkdf2Sync } from "node:crypto";
import { STUDENTS_REGISTER_ABI } from "./contracts/studentsRegisterContract";
import { AccountAbstraction } from "./AccountAbstraction";

// Use the real generated ABI instead of a manual string
import { University__factory } from "../../typechain-types/factories/contracts/University__factory";

// shared API types
import type {
  CredentialsResponse,
  StudentPayload,
  CourseResult,
  AllPermissionsForStudent,
  UniversityPermissionEntry,
} from "./types";
import { RPC_URL, STUDENTS_REGISTER_ADDRESS } from "./config";

// ----------------- ABIs for student owner style reads -----------------

/**
 * ABI for calling through the Student smart account as the student.
 *
 * - `executeViewCall`: generic view call via SmartAccount
 * - `getStudentInfo`: returns a single StudentInfo struct:
 *     tuple(
 *       tuple(name, surname, birthDate, birthPlace, country),
 *       tuple(...)[] results
 *     )
 * - `getPermissions`: returns all university addresses for a given role
 */
const STUDENT_OWNER_ABI = [
  // Account abstraction style view call
  "function executeViewCall(address target, bytes data) external view returns (bytes)",

  // Full student info (StudentInfo struct)
  "function getStudentInfo() external view returns (" +
    "tuple(" +
    "tuple(string,string,uint256,string,string)," +
    "tuple(string,string,address,string,uint16,string,uint256,string)[]" +
    ")" +
    ")",

  // List all universities for a given role code
  "function getPermissions(bytes32 permissionType) external view returns (address[])",
];

// IPFS gateway aligned with the original project
const IPFS_GATEWAY_URL =
  process.env.IPFS_GATEWAY_URL ?? "https://ipfs.io/ipfs/";

// ----------------- Shared blockchain setup -----------------

/**
 * Shared JSON RPC provider for all gateway blockchain operations.
 */
const provider = new JsonRpcProvider(RPC_URL);

/**
 * Minimal ABI for permission checks and updates on the Student contract.
 * This is used for grant and revoke operations executed via account abstraction.
 */
const STUDENT_PERM_ABI = [
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function revokePermission(address university)",
  "function grantPermission(bytes32 permissionType, address university)",
];

/**
 * Role identifiers used in the Student contract.
 * These values mirror the configuration in the SDK and smart contracts.
 */
const roleCodes = {
  readRequest: id("READER_APPLICANT"),
  writeRequest: id("WRITER_APPLICANT"),
  read: id("READER_ROLE"),
  write: id("WRITER_ROLE"),
};

type PermissionGrantKind = "read" | "write";

/**
 * Error used when credentials are invalid or refer to a non-existent student.
 * This lets the HTTP layer distinguish bad logins from internal failures.
 */
export class InvalidCredentialsError extends Error {
  constructor(
    message = "Invalid ID or password, or student is not registered"
  ) {
    super(message);
    this.name = "InvalidCredentialsError";
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Derives a deterministic Ethereum private key from a password and student ID.
 *
 * Uses PBKDF2 with SHA-256 and fixed parameters so that the same
 * (id, password) pair always yields the same key. This reproduces the logic
 * used when student wallets are created in the original EduWallet system.
 *
 * @param password - Student password as entered at login.
 * @param studentId - University issued student identifier.
 * @returns A hex encoded private key string starting with `0x`.
 */
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

/**
 * Safely converts various numeric like values into a JavaScript number.
 *
 * @param value - Number, bigint, or object with a `toString` method.
 * @returns Parsed number or 0 if conversion fails.
 */
function toNumber(value: any): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (value && typeof value.toString === "function") {
    const n = Number(value.toString());
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

/**
 * Converts a Unix timestamp (in seconds) into a YYYY-MM-DD string.
 *
 * @param unixSeconds - Unix time in seconds or compatible representation.
 * @returns ISO date string or empty string if the input is not a valid timestamp.
 */
function formatUnixDateToISO(unixSeconds: any): string {
  const n = toNumber(unixSeconds);
  if (!n || n <= 0) return "";
  return new Date(n * 1000).toISOString().slice(0, 10);
}

/**
 * Fetches metadata for a list of university smart accounts using the
 * generated University factory.
 *
 * Invalid or zero addresses are ignored. Any failures to read metadata
 * for a given address are logged and skipped.
 *
 * @param addresses - List of potential university contract addresses.
 * @returns A map from address to basic university information.
 */
async function fetchUniversitiesMeta(
  addresses: string[]
): Promise<Map<string, { name: string; country: string; shortName: string }>> {
  const unique = Array.from(
    new Set(
      addresses.filter(
        (a) =>
          a &&
          a !== "0x0000000000000000000000000000000000000000" &&
          a.startsWith("0x")
      )
    )
  );

  const map = new Map<
    string,
    { name: string; country: string; shortName: string }
  >();

  for (const addr of unique) {
    try {
      const uniContract = University__factory.connect(addr, provider as any);
      const info = await uniContract.getUniversityInfo();
      map.set(addr, {
        name: info.name,
        country: info.country,
        shortName: info.shortName,
      });
    } catch (err) {
      console.error("Failed to fetch university info for", addr, err);
      // leave it absent and fall back to empty metadata
    }
  }

  return map;
}

/**
 * Normalizes the on chain ECTS representation to a standard number of credits.
 *
 * Smart contracts store ECTS scaled by a factor of 100 in order to support
 * fractional values without floating point. This helper turns values back
 * into regular numbers such as 7.5.
 *
 * @param raw - ECTS value as bigint, number, or string.
 * @returns Normalized ECTS value as a JavaScript number.
 */
function normalizeEcts(raw: any): number {
  if (raw == null) return 0;
  try {
    if (typeof raw === "bigint") return Number(raw) / 100;
    if (typeof raw === "number") return raw / 100;
    if (typeof raw === "string" && raw.trim() !== "") {
      const n = Number(raw);
      if (!Number.isNaN(n)) return n / 100;
    }
  } catch (e) {
    console.error("Failed to normalize ECTS value:", raw, e);
  }
  return 0;
}

// ── Main client class ─────────────────────────────────────────────────────────

/**
 * High level client used by the HTTP gateway to interact with EduWallet.
 *
 * This class:
 *  - Reconstructs the student owner wallet from ID and password.
 *  - Looks up the student smart account via StudentsRegister.
 *  - Reads student data via `executeViewCall` on the student account.
 *  - Performs permission changes via account abstraction user operations.
 */
export class EduWalletClient {
  /**
   * Reads full student information via the student smart account
   * as the student owner.
   *
   * Internally encodes a call to `getStudentInfo` and wraps it in
   * `executeViewCall` on the Student contract. This does not depend
   * on any university permissions.
   *
   * @param studentWallet - Wallet reconstructed from student credentials.
   * @param studentSca - Address of the student smart account.
   * @returns Basic student information and the list of raw course results.
   * @throws {Error} If the smart account address is invalid or the call fails.
   */
  private async readStudentInfoAsOwner(
    studentWallet: Wallet,
    studentSca: string
  ): Promise<{ basicInfo: any; results: any[] }> {
    if (!studentSca || !studentSca.startsWith("0x")) {
      throw new Error("Valid student smart account address is required");
    }

    const studentContract = new Contract(
      studentSca,
      STUDENT_OWNER_ABI,
      provider
    );

    const iface = studentContract.interface;

    // Encode inner call: Student.getStudentInfo()
    const calldata = iface.encodeFunctionData("getStudentInfo", []);

    // Call Student.executeViewCall(studentSca, callData) as the student's EOA.
    const raw: string = await (studentContract as any)
      .connect(studentWallet)
      .executeViewCall(studentSca, calldata);

    // getStudentInfo returns one StudentInfo struct (tuple)
    const decoded = iface.decodeFunctionResult("getStudentInfo", raw);
    const studentInfo = decoded[0] as any;

    // StudentInfo = [ basicInfo, results ]
    const basicInfo = studentInfo[0];
    const results = (studentInfo[1] ?? []) as any[];

    return { basicInfo, results };
  }

  /**
   * Reads all permission sets for a student via `getPermissions` calls
   * on the student smart account as the student owner.
   *
   * This method uses `executeViewCall` to query:
   *  - R roles (read)
   *  - W roles (write)
   *  - read applicants
   *  - write applicants
   *
   * @param studentWallet - Wallet reconstructed from student credentials.
   * @param studentSca - Address of the student smart account.
   * @returns Arrays of university addresses grouped by permission type.
   * @throws {Error} If the smart account address is invalid or the calls fail.
   */
  private async readAllPermissionsAsOwner(
    studentWallet: Wallet,
    studentSca: string
  ): Promise<{
    read: string[];
    write: string[];
    readRequested: string[];
    writeRequested: string[];
  }> {
    if (!studentSca || !studentSca.startsWith("0x")) {
      throw new Error("Valid student smart account address is required");
    }

    const studentContract = new Contract(
      studentSca,
      STUDENT_OWNER_ABI,
      provider
    );

    const iface = studentContract.interface;

    const callRole = async (roleCode: string): Promise<string[]> => {
      const role =
        roleCode === "read"
          ? roleCodes.read
          : roleCode === "write"
          ? roleCodes.write
          : roleCode === "readRequest"
          ? roleCodes.readRequest
          : roleCodes.writeRequest;

      // Encode inner call: getPermissions(bytes32)
      const calldata = iface.encodeFunctionData("getPermissions", [role]);

      // Execute via executeViewCall as the student's EOA
      const raw: string = await (studentContract as any)
        .connect(studentWallet)
        .executeViewCall(studentSca, calldata);

      const decoded = iface.decodeFunctionResult("getPermissions", raw);
      const addrs = (decoded[0] ?? []) as string[];
      return addrs;
    };

    const [read, write, readRequested, writeRequested] = await Promise.all([
      callRole("read"),
      callRole("write"),
      callRole("readRequest"),
      callRole("writeRequest"),
    ]);

    return { read, write, readRequested, writeRequested };
  }

  /**
   * Returns a full multi university view of permissions for a student.
   *
   * The method:
   *  - Reconstructs the student's owner wallet from ID and password.
   *  - Reads role based permission lists via `readAllPermissionsAsOwner`.
   *  - Fetches university metadata for all distinct addresses.
   *  - Produces an `AllPermissionsForStudent` payload for the HTTP API.
   *
   * @param id - Student identifier used in the credential scheme.
   * @param password - Student password used to derive the owner key.
   * @param studentSca - Address of the student smart account.
   * @returns Multi university permissions view for the student.
   * @throws {Error} If credentials are missing or blockchain calls fail.
   */
  async getAllPermissionsAsStudent(
    id: string,
    password: string,
    studentSca: string
  ): Promise<AllPermissionsForStudent> {
    if (!id || !password) {
      throw new Error("id and password are required");
    }
    if (!studentSca) {
      throw new Error("studentSca is required");
    }

    // Rebuild student's EOA wallet
    const studentWallet = this.getStudentWalletFromCredentials(id, password);

    // Read all role based permission address lists
    const { read, write, readRequested, writeRequested } =
      await this.readAllPermissionsAsOwner(studentWallet, studentSca);

    // Collect all unique university addresses
    const allAddrs = Array.from(
      new Set<string>([
        ...read,
        ...write,
        ...readRequested,
        ...writeRequested,
      ])
    );

    // Fetch metadata for all those universities in one go
    const uniMetaMap = await fetchUniversitiesMeta(allAddrs);

    const permissions: UniversityPermissionEntry[] = [];

    for (const addr of allAddrs) {
      if (
        !addr ||
        addr === "0x0000000000000000000000000000000000000000" ||
        !addr.startsWith("0x")
      ) {
        continue;
      }

      const meta =
        uniMetaMap.get(addr) ?? {
          name: "",
          country: "",
          shortName: "",
        };

      permissions.push({
        universityAddress: addr,
        read: read.includes(addr),
        write: write.includes(addr),
        readRequested: readRequested.includes(addr),
        writeRequested: writeRequested.includes(addr),

        universityName: meta.name,
        universityCountry: meta.country,
        universityShortName: meta.shortName,
      });
    }

    return {
      studentSca,
      permissions,
    };
  }

  /**
   * Reconstructs the student's externally owned wallet from ID and password.
   *
   * This uses the same PBKDF2 based derivation as the original EduWallet
   * implementation so that the owner key is deterministic for a given
   * (id, password) pair.
   *
   * @param id - Student identifier as issued by the university.
   * @param password - Secret credential chosen or assigned to the student.
   * @returns A Wallet instance that can sign user operations for the student.
   * @throws {Error} If either parameter is missing.
   */
  getStudentWalletFromCredentials(id: string, password: string): Wallet {
    if (!id || !password) {
      throw new Error("Both id and password are required");
    }
    const privKey = derivePrivateKey(password, id);
    return new Wallet(privKey, provider);
  }

  /**
   * Authenticates a student and loads their academic data.
   *
   * Steps:
   *  1. Derive the student owner wallet from ID and password.
   *  2. Look up the student smart account via StudentsRegister.
   *  3. Read the student's basic information and results via `executeViewCall`.
   *  4. Map on chain tuples into a normalized `CredentialsResponse` payload.
   *
   * This method is called by the HTTP gateway in the `/auth/login` endpoint.
   *
   * @param id - Student identifier.
   * @param password - Student password.
   * @returns Normalized credentials and student data for use by clients.
   * @throws {Error} If the student smart account is not found or calls fail.
   */
  async loginStudent(
    id: string,
    password: string
  ): Promise<CredentialsResponse> {
    // 1) Rebuild student's EOA wallet from credentials
    const studentWallet = this.getStudentWalletFromCredentials(id, password);

    console.log(
      "Derived student wallet from credentials:",
      studentWallet.address
    );

    // 2) Find the student's smart account via StudentsRegister
    const localStudentsRegister = new Contract(
      STUDENTS_REGISTER_ADDRESS!,
      STUDENTS_REGISTER_ABI,
      provider
    );

    let contractAddress: string;
    try {
      contractAddress = await (
        localStudentsRegister.connect(studentWallet) as any
      ).getStudentAccount();
    } catch (err) {
      // A reverted StudentsRegister.getStudentAccount() for this derived wallet
      // almost certainly means "no such student" -> treat as bad credentials.
      if (isCallException(err)) {
        console.warn(
          "StudentsRegister.getStudentAccount reverted for derived student wallet; treating as invalid credentials"
        );
        throw new InvalidCredentialsError();
      }
      throw err;
    }

    if (
      !contractAddress ||
      contractAddress === "0x0000000000000000000000000000000000000000"
    ) {
      // Deterministically derived wallet, but no Student contract -> invalid creds / not registered.
      throw new InvalidCredentialsError();
    }

    // 3) Read student info via the student smart account (as owner)
    const { basicInfo, results } = await this.readStudentInfoAsOwner(
      studentWallet,
      contractAddress
    );

    // ---- Basic info: support both named and positional fields ----
    const bi: any = basicInfo;

    const studentName: string = bi.name ?? bi[0] ?? "";
    const studentSurname: string = bi.surname ?? bi[1] ?? "";
    const studentBirthDateRaw: any = bi.birthDate ?? bi[2] ?? 0;
    const studentBirthPlace: string = bi.birthPlace ?? bi[3] ?? "";
    const studentCountry: string = bi.country ?? bi[4] ?? "";

    // Fetch university metadata for all result universities
    const uniAddresses = (results ?? []).map(
      (r: any) => r.university ?? r[2] ?? ""
    );
    const uniMap = await fetchUniversitiesMeta(uniAddresses);

    // ---- Results: map tuple like structs into our CourseResult ----
    const courseResults: CourseResult[] = (results ?? []).map(
      (r: any): CourseResult => {
        // r may be both array like and object like, so support both
        const code: string = r.code ?? r[0] ?? "";
        const name: string = r.name ?? r[1] ?? "";
        const uniAddress: string = r.university ?? r[2] ?? "";
        const degreeCourse: string = r.degreeCourse ?? r[3] ?? "";
        const ectsRaw: any = r.ects ?? r[4] ?? 0;
        const gradeRaw: any = r.grade ?? r[5] ?? "";
        const dateRaw: any = r.date ?? r[6] ?? 0;
        const certHash: any = r.certificateHash ?? r[7] ?? "";

        const ects = normalizeEcts(ectsRaw);
        const evaluationDate = formatUnixDateToISO(dateRaw);
        const grade = (gradeRaw ?? "").toString();

        const certificate =
          certHash && typeof certHash === "string" && certHash.length > 0
            ? `${IPFS_GATEWAY_URL}${certHash}`
            : undefined;

        // Use metadata if available, otherwise fall back to blanks
        const uniMeta = uniMap.get(uniAddress) ?? {
          name: "",
          country: "",
          shortName: "",
        };

        return {
          name,
          code,
          degreeCourse,
          ects,
          grade,
          evaluationDate,
          university: uniMeta,
          ...(certificate !== undefined ? { certificate } : {}),
        };
      }
    );

    // 4) Build final StudentPayload
    const studentPayload: StudentPayload = {
      name: studentName,
      surname: studentSurname,
      birthDate: formatUnixDateToISO(studentBirthDateRaw),
      birthPlace: studentBirthPlace,
      country: studentCountry,
      results: courseResults,
    };

    // 5) Return the exact HTTP shape
    return {
      id,
      studentSca: contractAddress,
      student: studentPayload,
    };
  }

  /**
   * Grants read or write permission to a specific university on a student's
   * smart account by acting as the student.
   *
   * This method:
   *  - Reconstructs the student owner wallet from ID and password.
   *  - Encodes a `grantPermission` call on the Student contract.
   *  - Wraps it in an ERC-4337 style user operation and submits it.
   *
   * The target university address must be provided explicitly, which allows
   * the gateway to remain stateless with respect to "current university".
   *
   * @param id - Student identifier.
   * @param password - Student password.
   * @param studentSCA - Address of the student smart account.
   * @param kind - Permission kind to grant (`"read"` or `"write"`).
   * @param targetUniversity - University smart account address that should receive the permission.
   * @throws {Error} If inputs are missing or the on chain transaction fails.
   */
  async grantPermissionAsStudent(
    id: string,
    password: string,
    studentSCA: string,
    kind: PermissionGrantKind,
    targetUniversity: string | undefined
  ): Promise<void> {
    if (!id || !password) {
      throw new Error("id and password are required");
    }
    if (!studentSCA) {
      throw new Error("studentSCA is required");
    }

    if (!targetUniversity || !targetUniversity.startsWith("0x")) {
      throw new Error("targetUniversity address is required");
    }

    // Rebuild student's EOA wallet from credentials
    const studentWallet = this.getStudentWalletFromCredentials(id, password);

    // Student smart account (Student contract) at studentSCA
    const studentContract = new Contract(
      studentSCA,
      STUDENT_PERM_ABI,
      provider
    );

    const permissionRole = kind === "write" ? roleCodes.write : roleCodes.read;

    // Account abstraction manager using student's wallet
    const aa = new AccountAbstraction(provider, studentWallet);

    // Call Student.grantPermission(permissionRole, targetUniversity)
    const callData = studentContract.interface.encodeFunctionData(
      "grantPermission",
      [permissionRole, targetUniversity]
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

  /**
   * Revokes a university's permission on a student's smart account
   * by acting as the student.
   *
   * This method:
   *  - Reconstructs the student owner wallet from ID and password.
   *  - Encodes a `revokePermission` call on the Student contract.
   *  - Wraps it in an ERC-4337 style user operation and submits it.
   *
   * The university to revoke must be provided explicitly.
   *
   * @param id - Student identifier.
   * @param password - Student password.
   * @param studentSCA - Address of the student smart account.
   * @param targetUniversity - University smart account address whose permission should be revoked.
   * @throws {Error} If inputs are missing or the on chain transaction fails.
   */
  async revokePermissionAsStudent(
    id: string,
    password: string,
    studentSCA: string,
    targetUniversity: string | undefined
  ): Promise<void> {
    if (!id || !password) {
      throw new Error("id and password are required");
    }
    if (!studentSCA) {
      throw new Error("studentSCA is required");
    }

    if (!targetUniversity || !targetUniversity.startsWith("0x")) {
      throw new Error("targetUniversity address is required");
    }

    // Rebuild student's EOA wallet from credentials
    const studentWallet = this.getStudentWalletFromCredentials(id, password);

    // Student smart account (Student contract) at studentSCA
    const studentContract = new Contract(
      studentSCA,
      STUDENT_PERM_ABI,
      provider
    );

    // Account abstraction manager using student's wallet
    const aa = new AccountAbstraction(provider, studentWallet);

    // Call Student.revokePermission(targetUniversity)
    const callData = studentContract.interface.encodeFunctionData(
      "revokePermission",
      [targetUniversity]
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
