import type { PortalRequest } from "../types/portal";

export function getDashboardSummary(requests: PortalRequest[]) {
  const pending = requests.filter((r) => r.status === "pending").length;
  const approved = requests.filter((r) => r.status === "approved").length;
  const rejected = requests.filter((r) => r.status === "rejected").length;

  return {
    total: requests.length,
    pending,
    approved,
    rejected,
  };
}
