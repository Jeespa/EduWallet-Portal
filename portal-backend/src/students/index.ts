import { DemoStudentSource } from "./demoStudentSource";
import type { StudentSource } from "./studentSource";

const sourceType = process.env.STUDENT_SOURCE ?? "demo";

function createStudentSource(): StudentSource {
  switch (sourceType) {
    case "demo":
      return new DemoStudentSource();

    default:
      throw new Error(`Unsupported STUDENT_SOURCE "${sourceType}". Supported values: demo.`);
  }
}

export const studentSource = createStudentSource();
