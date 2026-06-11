// src/models/student.ts

/**
 * Represents a student in the system with their personal information
 * and academic results.
 */
export class StudentModel {
  // Immutable properties
  public readonly id: string;
  public readonly accountAddress: string;

  // Mutable properties
  public name: string = "";
  public surname: string = "";
  public birthDate: string = "";
  public birthPlace: string = "";
  public country: string = "";
  private results: Result[] = [];

  /**
   * Creates a new StudentModel instance.
   * @param id - The student's ID
   * @param accountAddress - The student's smart contract address
   */
  constructor(id: string, accountAddress: string) {
    this.id = id;
    this.accountAddress = accountAddress;
  }

  /**
   * Creates an empty StudentModel instance with default values.
   */
  static createEmpty(): StudentModel {
    return new StudentModel("", "");
  }

  /**
   * Gets all academic results.
   */
  getResults(): Result[] {
    // Return a copy to prevent direct modification
    return [...this.results];
  }

  /**
   * Gets results for a specific university.
   */
  getResultsByUniversity(universityAddress: string): Result[] {
    return this.results.filter((result) => result.university === universityAddress);
  }

  /**
   * Gets results grouped by degree course for a specific university.
   */
  getResultsByUniversityGroupedByCourseDegree(universityAddress: string): {
    [key: string]: Result[];
  } {
    return this.getResultsByUniversity(universityAddress).reduce(
      (acc, result) => {
        if (!acc[result.degreeCourse]) {
          acc[result.degreeCourse] = [];
        }
        acc[result.degreeCourse].push(result);
        return acc;
      },
      {} as { [key: string]: Result[] },
    );
  }

  /**
   * Retrieves a unique set of university addresses from student's results.
   */
  getResultsUniversities(): Set<string> {
    return new Set(this.results.map((r) => r.university));
  }

  /**
   * Simple setter if we ever want to update results in one go.
   * (Not currently used, but harmless.)
   */
  updateResults(results: Result[]): void {
    this.results = [...results];
  }

  /**
   * Converts the student to a plain object for serialization.
   */
  toObject(): object {
    return {
      id: this.id,
      walletAddress: this.accountAddress,
      name: this.name,
      surname: this.surname,
      birthDate: this.birthDate,
      birthPlace: this.birthPlace,
      country: this.country,
    };
  }
}

/**
 * Represents an academic result.
 */
export interface Result {
  /** Name of the academic course or exam */
  readonly name: string;
  /** Unique code identifier for the course */
  readonly code: string;
  /** Ethereum address of the university issuing the result */
  readonly university: string;
  /** Name of the degree program this result belongs to */
  readonly degreeCourse: string;
  /** Academic grade received (or "N/D" if not available) */
  readonly grade: string;
  /** Localized date string */
  readonly date: string;
  /** Number of ECTS credits */
  readonly ects: number;
  /** Content identifier for the certificate in IPFS */
  readonly certificateCid: string;
}

/**
 * Represents student authentication credentials.
 */
export interface Credentials {
  /** Student's unique identifier */
  id: string;
  /** Student's authentication password */
  password: string;
}
