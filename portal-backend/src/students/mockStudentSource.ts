import type { PortalStudentReference } from "../../../shared/portalApiTypes";
import type { FindStudentInput, StudentSource } from "./studentSource";

const MOCK_STUDENT_REFERENCES: PortalStudentReference[] = [
  {
    studentId: "s123456",
    studentSca: "0x7A1B2C3D4E5F6789012345678901234567890ABC",
    name: "Anna Berg",
    homeInstitution: "NTNU University",
    permissionStatus: "write",
  },
  {
    studentId: "s654321",
    studentSca: "0x1234567890ABCDEF1234567890ABCDEF12345678",
    name: "Jonas Nilsen",
    homeInstitution: "University of Oslo",
    permissionStatus: "read",
  },
  {
    studentId: "s777888",
    studentSca: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
    name: "Mia Hansen",
    homeInstitution: "BI Norwegian Business School",
    permissionStatus: "none",
  },
];

export class MockStudentSource implements StudentSource {
  async search(query?: string): Promise<PortalStudentReference[]> {
    const q = (query ?? "").trim().toLowerCase();

    return MOCK_STUDENT_REFERENCES.filter((student) => {
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

    const match = MOCK_STUDENT_REFERENCES.find((student) => {
      const studentIdMatches = !!studentId && student.studentId === studentId;
      const studentScaMatches =
        !!studentSca && student.studentSca.toLowerCase() === studentSca;

      return studentIdMatches || studentScaMatches;
    });

    return match ?? null;
  }
}