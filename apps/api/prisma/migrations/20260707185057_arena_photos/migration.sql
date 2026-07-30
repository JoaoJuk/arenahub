-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Arena" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sports" TEXT NOT NULL,
    "photoUrl" TEXT,
    "photos" TEXT NOT NULL DEFAULT '',
    "rating" REAL NOT NULL DEFAULT 4.8,
    CONSTRAINT "Arena_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Arena" ("address", "city", "description", "id", "name", "ownerId", "photoUrl", "rating", "sports") SELECT "address", "city", "description", "id", "name", "ownerId", "photoUrl", "rating", "sports" FROM "Arena";
DROP TABLE "Arena";
ALTER TABLE "new_Arena" RENAME TO "Arena";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
