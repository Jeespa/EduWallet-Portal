import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { PortalStudentReference } from "../../../shared/portalApiTypes";
import type { FindStudentInput, StudentSource } from "./studentSource";

const FALLBACK_STUDENTS: PortalStudentReference[] = [
  {
    studentId: "s123456",
    studentSca: "0x7A1B2C3D4E5F6789012345678901234567890ABC",
    name: "Anna Berg",
    homeInstitution: "NTNU University",
    permissionStatus: "write",
  },
];

type DemoBlockchainFile = {
  students?: Array<{
    studentId: string;
    studentSca: string;
    name?: string;
    homeInstitution?: string;
    permissionStatus?: PortalStudentReference["permissionStatus"];
  }>;
};

function loadDemoStudents(): PortalStudentReference[] {
  const relativeFile =
    process.env.PORTAL_DEMO_STUDENTS_FILE ??
    "src/demo/portalDemoBlockchain.json";

  const filePath = path.resolve(process.cwd(), relativeFile);

  if (!existsSync(filePath)) {
    console.warn("Demo student file not found:", filePath);
    return FALLBACK_STUDENTS;
  }

  try {
    const parsed = JSON.parse(
      readFileSync(filePath, "utf-8")
    ) as DemoBlockchainFile;

    const students = parsed.students ?? [];

    if (students.length === 0) {
      return FALLBACK_STUDENTS;
    }

    return students.map((student) => ({
      studentId: student.studentId,
      studentSca: student.studentSca,
      name: student.name,
      homeInstitution: student.homeInstitution,
      permissionStatus: student.permissionStatus ?? "none",
    }));
  } catch (error) {
    console.warn("Could not load generated portal demo students:", error);
    return FALLBACK_STUDENTS;
  }
}

export class MockStudentSource implements StudentSource {
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

  async findByIdOrSca(
    input: FindStudentInput
  ): Promise<PortalStudentReference | null> {
    const studentId = input.studentId?.trim();
    const studentSca = input.studentSca?.trim().toLowerCase();
    const students = loadDemoStudents();

    const match = students.find((student) => {
      const studentIdMatches = !!studentId && student.studentId === studentId;
      const studentScaMatches =
        !!studentSca && student.studentSca.toLowerCase() === studentSca;

      return studentIdMatches || studentScaMatches;
    });

    return match ?? null;
  }
}