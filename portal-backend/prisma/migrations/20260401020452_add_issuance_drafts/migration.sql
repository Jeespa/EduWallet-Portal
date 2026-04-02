-- CreateEnum
CREATE TYPE "IssuanceDraftStatus" AS ENUM ('DRAFT', 'READY', 'SUBMITTED', 'FAILED');

-- CreateTable
CREATE TABLE "IssuanceDraft" (
    "id" TEXT NOT NULL,
    "studentId" TEXT,
    "studentSca" TEXT NOT NULL,
    "courseCode" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "degreeCourse" TEXT,
    "ects" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "evaluationDate" TEXT NOT NULL,
    "certificateCid" TEXT,
    "status" "IssuanceDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,

    CONSTRAINT "IssuanceDraft_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "IssuanceDraft" ADD CONSTRAINT "IssuanceDraft_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuanceDraft" ADD CONSTRAINT "IssuanceDraft_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "PortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
