-- CreateEnum
CREATE TYPE "RequestPermissionType" AS ENUM ('READ', 'WRITE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "PermissionRequestLog" (
    "id" TEXT NOT NULL,
    "studentId" TEXT,
    "studentSca" TEXT NOT NULL,
    "permissionType" "RequestPermissionType" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,

    CONSTRAINT "PermissionRequestLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PermissionRequestLog" ADD CONSTRAINT "PermissionRequestLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionRequestLog" ADD CONSTRAINT "PermissionRequestLog_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "PortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
