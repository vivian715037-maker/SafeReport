-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Report" (
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
    "riskLevel" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "riskReason" TEXT NOT NULL DEFAULT '',
    "riskAssessedAt" DATETIME,
    "riskModel" TEXT,
    "userReportedAt" DATETIME,
    CONSTRAINT "Report_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "BrowserOwner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Report" ("aiConsentAt", "aiSummary", "description", "draftText", "expiresAt", "id", "imagePath", "isDraft", "isPublic", "latitude", "locationLabel", "longitude", "ownerId", "photoConsentAt", "photoPublic", "placeType", "publicConsentAt", "riskType", "status", "title", "updatedAt", "uploadedAt", "userReportedAt") SELECT "aiConsentAt", "aiSummary", "description", "draftText", "expiresAt", "id", "imagePath", "isDraft", "isPublic", "latitude", "locationLabel", "longitude", "ownerId", "photoConsentAt", "photoPublic", "placeType", "publicConsentAt", "riskType", "status", "title", "updatedAt", "uploadedAt", "userReportedAt" FROM "Report";
DROP TABLE "Report";
ALTER TABLE "new_Report" RENAME TO "Report";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
