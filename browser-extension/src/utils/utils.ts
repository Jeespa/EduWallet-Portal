import { logError } from "./conf";

/**
 * Formats a camelCase string into "Camel case" (spaces + capitalized first letter).
 */
export function formatCamelCaseString(str: string): string {
  try {
    if (!str || typeof str !== "string") {
      throw new Error("Invalid input: expected a non-empty string");
    }

    const spacedString = str.replace(/([A-Z])/g, " $1").toLowerCase();
    const formattedString = spacedString.charAt(0).toUpperCase() + spacedString.slice(1);
    return formattedString;
  } catch (error) {
    logError("Failed to format camel case string:", error);
    return str || "";
  }
}

/**
 * Formats a Unix timestamp (bigint, seconds) into a local date string.
 */
export function formatDate(timestamp: bigint): string {
  try {
    if (timestamp === undefined || timestamp === null) {
      throw new Error("Invalid timestamp: value is undefined or null");
    }

    const timestampNumber = Number(timestamp); // may lose precision for huge values

    if (isNaN(timestampNumber)) {
      throw new Error("Invalid timestamp: could not convert to number");
    }

    if (timestampNumber < 0) {
      throw new Error("Invalid timestamp: negative value");
    }

    const date = new Date(timestampNumber * 1000);

    if (isNaN(date.getTime())) {
      throw new Error("Invalid date created from timestamp");
    }

    return date.toLocaleDateString();
  } catch (error) {
    logError("Date formatting failed:", error);
    return "Invalid date";
  }
}
