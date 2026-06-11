export type PermissionStatus = "none" | "pending-read" | "pending-write" | "read" | "write";

export type PortalStudentReference = {
  studentId: string;
  studentSca: string;
  name?: string;
  homeInstitution?: string;
  permissionStatus?: PermissionStatus;
};

export const MOCK_STUDENT_REFERENCES: PortalStudentReference[] = [
  {
    studentId: "s123456",
    studentSca: "0x7A1B2C3D4E5F6789012345678901234567890ABC",
    name: "Anna Berg",
    homeInstitution: "NTNU University",
    permissionStatus: "pending-write",
  },
  {
    studentId: "s654321",
    studentSca: "0x1234567890ABCDEF1234567890ABCDEF12345678",
    name: "Jonas Nilsen",
    homeInstitution: "University of Oslo",
    permissionStatus: "write",
  },
  {
    studentId: "s777888",
    studentSca: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
    name: "Mia Hansen",
    homeInstitution: "BI Norwegian Business School",
    permissionStatus: "none",
  },
];
