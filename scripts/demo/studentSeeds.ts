import type { StudentSeed } from "./types";

/**
 * Fixed demo scenarios used by the portal and mobile usability tests.
 *
 * The actual student IDs and passwords are generated at bootstrap time, but the
 * names, courses, and intended access states are kept stable so the test tasks
 * remain predictable.
 */
export const STUDENT_SEEDS: StudentSeed[] = [
  {
    name: "Anna",
    surname: "Berg",
    birthDate: "2000-04-12",
    birthPlace: "Trondheim",
    country: "Norway",
    homeInstitution: "NTNU University",
    registeredBy: "ntnu",
    initialAccess: {
      nordicHiring: "none",
    },
    testPurpose: "Nordic Hiring task: request read access.",
    courses: [
      {
        code: "IDATT2104",
        name: "Network Programming",
        degreeCourse: "Computer Science",
        ects: 7.5,
        grade: "A",
        evaluationDate: "2025-05-20",
      },
      {
        code: "TDT4100",
        name: "Object-Oriented Programming",
        degreeCourse: "Computer Science",
        ects: 7.5,
        grade: "B",
        evaluationDate: "2025-06-02",
      },
    ],
  },
  {
    name: "Jonas",
    surname: "Holm",
    birthDate: "1999-09-03",
    birthPlace: "Oslo",
    country: "Norway",
    homeInstitution: "NTNU University",
    registeredBy: "ntnu",
    initialAccess: {
      nordicHiring: "read",
    },
    testPurpose: "Nordic Hiring task: verify an existing course result.",
    courses: [
      {
        code: "TDT4100",
        name: "Object-Oriented Programming",
        degreeCourse: "Computer Science",
        ects: 7.5,
        grade: "C",
        evaluationDate: "2025-06-05",
      },
      {
        code: "TDT4140",
        name: "Software Engineering",
        degreeCourse: "Computer Science",
        ects: 7.5,
        grade: "B",
        evaluationDate: "2025-05-28",
      },
    ],
  },
  {
    name: "Emil",
    surname: "Nilsen",
    birthDate: "2000-11-22",
    birthPlace: "Stavanger",
    country: "Norway",
    homeInstitution: "Trondheim Business School",
    registeredBy: "tbs",
    initialAccess: {
      ntnu: "none",
      nordicHiring: "none",
    },
    testPurpose: "NTNU task: request write access.",
    courses: [
      {
        code: "TDT4180",
        name: "Human-Computer Interaction",
        degreeCourse: "Information Systems",
        ects: 7.5,
        grade: "B",
        evaluationDate: "2025-05-25",
      },
      {
        code: "TDT4100",
        name: "Object-Oriented Programming",
        degreeCourse: "Information Systems",
        ects: 7.5,
        grade: "D",
        evaluationDate: "2025-06-04",
      },
    ],
  },
  {
    name: "Sara",
    surname: "Lund",
    birthDate: "2001-01-18",
    birthPlace: "Bergen",
    country: "Norway",
    homeInstitution: "NTNU University",
    registeredBy: "ntnu",
    initialAccess: {
      nordicHiring: "none",
    },
    testPurpose: "NTNU task: issue a new academic result.",
    courses: [
      {
        code: "IDATT2104",
        name: "Network Programming",
        degreeCourse: "Computer Science",
        ects: 7.5,
        grade: "B",
        evaluationDate: "2025-05-19",
      },
      {
        code: "TDT4120",
        name: "Algorithms and Data Structures",
        degreeCourse: "Computer Science",
        ects: 7.5,
        grade: "C",
        evaluationDate: "2025-06-10",
      },
    ],
  },
  {
    name: "Nora",
    surname: "Solheim",
    birthDate: "1998-07-30",
    birthPlace: "Tromsø",
    country: "Norway",
    homeInstitution: "Trondheim Business School",
    registeredBy: "tbs",
    initialAccess: {
      ntnu: "read",
      nordicHiring: "read",
    },
    testPurpose: "Backup verification student. Both NTNU and Nordic Hiring have read access.",
    courses: [
      {
        code: "IDATT2104",
        name: "Network Programming",
        degreeCourse: "Information Systems",
        ects: 7.5,
        grade: "C",
        evaluationDate: "2025-05-22",
      },
      {
        code: "TDT4100",
        name: "Object-Oriented Programming",
        degreeCourse: "Information Systems",
        ects: 7.5,
        grade: "A",
        evaluationDate: "2025-06-01",
      },
    ],
  },
  {
    name: "Maya",
    surname: "Eide",
    birthDate: "2002-02-14",
    birthPlace: "Ålesund",
    country: "Norway",
    homeInstitution: "University of Oslo",
    registeredBy: "uio",
    initialAccess: {
      ntnu: "none",
      nordicHiring: "none",
    },
    initialRequests: {
      ntnu: "read",
    },
    testPurpose: "Student mobile app test: pending NTNU view request is available immediately.",
    courses: [
      {
        code: "IN1000",
        name: "Introduction to Object-Oriented Programming",
        degreeCourse: "Informatics",
        ects: 10,
        grade: "B",
        evaluationDate: "2025-05-30",
      },
      {
        code: "IN2010",
        name: "Algorithms and Data Structures",
        degreeCourse: "Informatics",
        ects: 10,
        grade: "A",
        evaluationDate: "2025-06-07",
      },
    ],
  },
];
