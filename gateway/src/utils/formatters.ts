/**
 * Safely converts numeric-like values from ethers/Solidity into a number.
 */
export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);

  if (
    value !== null &&
    value !== undefined &&
    typeof (value as { toString?: unknown }).toString === "function"
  ) {
    const n = Number((value as { toString: () => string }).toString());
    return Number.isNaN(n) ? 0 : n;
  }

  return 0;
}

/**
 * Converts a Unix timestamp in seconds into a YYYY-MM-DD string.
 */
export function formatUnixDateToISO(unixSeconds: unknown): string {
  const n = toNumber(unixSeconds);
  if (!n || n <= 0) return "";
  return new Date(n * 1000).toISOString().slice(0, 10);
}

/**
 * Normalizes the on-chain ECTS representation to regular ECTS credits.
 *
 * The smart contract stores ECTS multiplied by 100 to support fractional values.
 */
export function normalizeEcts(raw: unknown): number {
  if (raw === null || raw === undefined) return 0;

  try {
    if (typeof raw === "bigint") return Number(raw) / 100;
    if (typeof raw === "number") return raw / 100;

    if (typeof raw === "string" && raw.trim() !== "") {
      const n = Number(raw);
      if (!Number.isNaN(n)) return n / 100;
    }
  } catch (err) {
    console.error("Failed to normalize ECTS value:", raw, err);
  }

  return 0;
}
