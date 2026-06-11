/**
 * Error used when credentials are invalid or refer to a non-existent student.
 * This lets the HTTP layer distinguish bad logins from internal failures.
 */
export class InvalidCredentialsError extends Error {
  constructor(message = "Invalid ID or password, or student is not registered") {
    super(message);
    this.name = "InvalidCredentialsError";
  }
}
