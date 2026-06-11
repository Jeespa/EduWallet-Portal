import { Contract, Wallet, isCallException } from "ethers";
import { STUDENTS_REGISTER_ABI } from "../contracts/studentsRegisterContract";
import { STUDENT_OWNER_ABI } from "../contracts/studentContractAbis";
import { provider } from "../blockchain/provider";
import { IPFS_GATEWAY_URL, STUDENTS_REGISTER_ADDRESS } from "../config";
import { InvalidCredentialsError } from "../errors";
import type { CourseResult, StudentPayload } from "../types";
import { formatUnixDateToISO, normalizeEcts } from "../utils/formatters";
import { EMPTY_UNIVERSITY_METADATA, fetchUniversitiesMeta } from "./universityMetadataService";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export type RawStudentInfo = {
  basicInfo: any;
  results: any[];
};

/**
 * Looks up the student smart account for the derived student owner wallet.
 */
export async function getStudentSmartAccount(studentWallet: Wallet): Promise<string> {
  const studentsRegister = new Contract(STUDENTS_REGISTER_ADDRESS, STUDENTS_REGISTER_ABI, provider);

  try {
    const studentSca = await (studentsRegister.connect(studentWallet) as any).getStudentAccount();

    if (!studentSca || studentSca === ZERO_ADDRESS) {
      throw new InvalidCredentialsError();
    }

    return studentSca;
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      throw err;
    }

    if (isCallException(err)) {
      console.warn(
        "StudentsRegister.getStudentAccount reverted for derived student wallet; treating as invalid credentials",
      );
      throw new InvalidCredentialsError();
    }

    throw err;
  }
}

/**
 * Reads full student information through the student smart account as owner.
 */
export async function readStudentInfoAsOwner(
  studentWallet: Wallet,
  studentSca: string,
): Promise<RawStudentInfo> {
  if (!studentSca || !studentSca.startsWith("0x")) {
    throw new Error("Valid student smart account address is required");
  }

  const studentContract = new Contract(studentSca, STUDENT_OWNER_ABI, provider);
  const iface = studentContract.interface;

  const calldata = iface.encodeFunctionData("getStudentInfo", []);
  const raw: string = await (studentContract as any)
    .connect(studentWallet)
    .executeViewCall(studentSca, calldata);

  const decoded = iface.decodeFunctionResult("getStudentInfo", raw);
  const studentInfo = decoded[0] as any;

  return {
    basicInfo: studentInfo[0],
    results: (studentInfo[1] ?? []) as any[],
  };
}

/**
 * Maps raw on-chain student tuples into the shared gateway response shape.
 */
export async function mapStudentPayload(rawStudentInfo: RawStudentInfo): Promise<StudentPayload> {
  const { basicInfo, results } = rawStudentInfo;
  const bi = basicInfo as any;

  const studentName: string = bi.name ?? bi[0] ?? "";
  const studentSurname: string = bi.surname ?? bi[1] ?? "";
  const studentBirthDateRaw: any = bi.birthDate ?? bi[2] ?? 0;
  const studentBirthPlace: string = bi.birthPlace ?? bi[3] ?? "";
  const studentCountry: string = bi.country ?? bi[4] ?? "";

  const universityAddresses = (results ?? []).map(
    (result: any) => result.university ?? result[2] ?? "",
  );
  const universityMap = await fetchUniversitiesMeta(universityAddresses);

  const courseResults: CourseResult[] = (results ?? []).map((result: any): CourseResult => {
    const code: string = result.code ?? result[0] ?? "";
    const name: string = result.name ?? result[1] ?? "";
    const universityAddress: string = result.university ?? result[2] ?? "";
    const degreeCourse: string = result.degreeCourse ?? result[3] ?? "";
    const ectsRaw: any = result.ects ?? result[4] ?? 0;
    const gradeRaw: any = result.grade ?? result[5] ?? "";
    const dateRaw: any = result.date ?? result[6] ?? 0;
    const certificateHash: any = result.certificateHash ?? result[7] ?? "";

    const certificate =
      typeof certificateHash === "string" && certificateHash.length > 0
        ? `${IPFS_GATEWAY_URL}${certificateHash}`
        : undefined;

    const university = universityMap.get(universityAddress) ?? EMPTY_UNIVERSITY_METADATA;

    return {
      name,
      code,
      degreeCourse,
      ects: normalizeEcts(ectsRaw),
      grade: (gradeRaw ?? "").toString(),
      evaluationDate: formatUnixDateToISO(dateRaw),
      university,
      ...(certificate !== undefined ? { certificate } : {}),
    };
  });

  return {
    name: studentName,
    surname: studentSurname,
    birthDate: formatUnixDateToISO(studentBirthDateRaw),
    birthPlace: studentBirthPlace,
    country: studentCountry,
    results: courseResults,
  };
}
