import type { StudentSearchResponse } from "../../../shared/portalApiTypes";
import { studentSource } from "../students";

export async function searchStudents(
  query?: string
): Promise<StudentSearchResponse> {
  const results = await studentSource.search(query);

  return {
    results,
    count: results.length,
  };
}