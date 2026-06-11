import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { PortalStudentReference } from "../../../shared/portalApiTypes";
import type { FindStudentInput, StudentSource } from "./studentSource";

/**
 * Demo student source for local end-to-end testing.
 *
 * This does not store academic records. It only loads generated student metadata
 * such as student ID and smart account address from bootstrapPortalDemo.ts.
 *
 * Actual academic data, grades, permissions, and course results are read from
 * and written to EduWallet through the SDK/contracts.
 */
type DemoBlockchainFile = {
  students?: Array<{
    studentId: string;
    studentSca: string;
    name?: string;
    homeInstitution?: string;
    permissionStatus?: PortalStudentReference["permissionStatus"];
  }>;
};

/**
 * Loads the generated demo metadata file on demand.
 *
 * Keeping this as a file read makes it easy to restart the demo chain and
 * regenerate student addresses without reseeding static data in TypeScript.
 */
function loadDemoStudents(): PortalStudentReference[] {
  const relativeFile =
    process.env.PORTAL_DEMO_STUDENTS_FILE ?? "src/demo/portalDemoBlockchain.json";

  const filePath = path.resolve(process.cwd(), relativeFile);

  if (!existsSync(filePath)) {
    throw new Error(
      `Demo student file not found: ${filePath}. Run bootstrapPortalDemo.ts before starting the portal backend.`,
    );
  }

  let parsed: DemoBlockchainFile;

  try {
    parsed = JSON.parse(readFileSync(filePath, "utf-8")) as DemoBlockchainFile;
  } catch (error) {
    throw new Error(
      `Could not read or parse demo student file: ${filePath}. Original error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const students = parsed.students ?? [];

  if (students.length === 0) {
    throw new Error(
      `Demo student file contains no students: ${filePath}. Rerun bootstrapPortalDemo.ts.`,
    );
  }

  return students.map((student) => ({
    studentId: student.studentId,
    studentSca: student.studentSca,
    name: student.name,
    homeInstitution: student.homeInstitution,
    permissionStatus: student.permissionStatus ?? "none",
  }));
}

/**
 * StudentSource implementation backed by bootstrapPortalDemo.ts output.
 */
export class DemoStudentSource implements StudentSource {
  /**
   * Searches generated demo students by ID, smart account, name, or institution.
   */
  async search(query?: string): Promise<PortalStudentReference[]> {
    const q = (query ?? "").trim().toLowerCase();
    const students = loadDemoStudents();

    return students.filter((student) => {
      if (!q) return true;

      return (
        student.studentId.toLowerCase().includes(q) ||
        student.studentSca.toLowerCase().includes(q) ||
        (student.name?.toLowerCase().includes(q) ?? false) ||
        (student.homeInstitution?.toLowerCase().includes(q) ?? false)
      );
    });
  }

  /**
   * Finds the exact generated student referenced by portal requests or forms.
   */
  async findByIdOrSca(input: FindStudentInput): Promise<PortalStudentReference | null> {
    const studentId = input.studentId?.trim();
    const studentSca = input.studentSca?.trim().toLowerCase();
    const students = loadDemoStudents();

    const match = students.find((student) => {
      const studentIdMatches = !!studentId && student.studentId === studentId;
      const studentScaMatches = !!studentSca && student.studentSca.toLowerCase() === studentSca;

      return studentIdMatches || studentScaMatches;
    });

    return match ?? null;
  }
}
