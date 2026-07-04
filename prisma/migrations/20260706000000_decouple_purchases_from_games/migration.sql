-- DropForeignKey
ALTER TABLE "GamePurchase" DROP CONSTRAINT "GamePurchase_gameId_fkey";

-- DropIndex
DROP INDEX "GamePurchase_gameId_idx";

-- AlterTable
ALTER TABLE "GamePurchase" DROP COLUMN "gameId";

