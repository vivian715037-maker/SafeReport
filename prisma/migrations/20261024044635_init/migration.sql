-- CreateTable
CREATE TABLE "BrowserOwner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "riskType" TEXT NOT NULL DEFAULT '기타',
    "aiSummary" TEXT NOT NULL DEFAULT '',
    "draftText" TEXT NOT NULL DEFAULT '',
    "imagePath" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "locationLabel" TEXT NOT NULL DEFAULT '',
    "placeType" TEXT NOT NULL DEFAULT '공공시설',
    "status" TEXT NOT NULL DEFAULT 'PREPARING',
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "photoPublic" BOOLEAN NOT NULL DEFAULT false,
    "publicConsentAt" DATETIME,
    "photoConsentAt" DATETIME,
    "aiConsentAt" DATETIME,
    "userReportedAt" DATETIME,
    CONSTRAINT "Report_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "BrowserOwner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportStatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changeSource" TEXT NOT NULL,
    CONSTRAINT "ReportStatusHistory_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "BrowserOwner_tokenHash_key" ON "BrowserOwner"("tokenHash");
