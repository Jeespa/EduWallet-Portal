export type University = {
  name: string;
  country: string;
  shortName: string;
};

export type AcademicResult = {
  code: string;
  name: string;
  degreeCourse: string;
  ects: number;
  grade?: string;
  evaluationDate?: string;
  university: University;
  certificate?: string;
};

export type Student = {
  name: string;
  surname: string;
  birthDate: string;
  birthPlace: string;
  country: string;
  results?: AcademicResult[];
};

export type CredentialsResponse = {
  studentAddress: string;
  student: Student;
};

export interface PermissionStatus {
  studentSca: string;
  universitySmartAccount: string;
  universityName?: string;
  universityCountry?: string;
  universityShortName?: string;
  read: boolean;
  write: boolean;
  readRequested: boolean;
  writeRequested: boolean;
  level: 0 | 1 | 2 | 3;
}


