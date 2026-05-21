import { DemoStudentSource } from "./demoStudentSource";
import { GatewayStudentSource } from "./gatewayStudentSource";
import type { StudentSource } from "./studentSource";

const sourceType = process.env.STUDENT_SOURCE ?? "demo";
const gatewayBaseUrl = process.env.GATEWAY_BASE_URL ?? "http://localhost:3001";

function createStudentSource(): StudentSource {
  switch (sourceType) {
    case "gateway":
      return new GatewayStudentSource({
        baseUrl: gatewayBaseUrl,
      });

    case "demo":
    case "mock":
    default:
      return new DemoStudentSource();
  }
}

export const studentSource = createStudentSource();