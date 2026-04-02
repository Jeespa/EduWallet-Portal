import type { PortalStudentReference } from "../../../shared/portalApiTypes";

export type FindStudentInput = {
  studentId?: string;
  studentSca?: string;
};

export interface StudentSource {
  search(query?: string): Promise<PortalStudentReference[]>;
  findByIdOrSca(input: FindStudentInput): Promise<PortalStudentReference | null>;
}