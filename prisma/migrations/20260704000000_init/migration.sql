-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CompletionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TokenTransactionType" AS ENUM ('EARN_COMPLETION', 'SPEND_PURCHASE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ItemLayout" AS ENUM ('LIST', 'GRID');

-- CreateEnum
CREATE TYPE "ImageFit" AS ENUM ('CONTAIN', 'COVER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "activeChecklistLimit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "platform" TEXT,
    "coverImageUrl" TEXT,
    "releaseYear" INTEGER,
    "notes" TEXT,
    "igdbId" INTEGER,
    "summary" TEXT,
    "genres" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checklist" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "tokenReward" INTEGER,
    "badgeName" TEXT,
    "badgeIconUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActiveChecklist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActiveChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistTab" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "canvasBgColor" TEXT,
    "canvasBgImageUrl" TEXT,
    "bgColor" TEXT,
    "textColor" TEXT,
    "borderColor" TEXT,
    "textSize" INTEGER,

    CONSTRAINT "ChecklistTab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistSection" (
    "id" TEXT NOT NULL,
    "tabId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "itemLayout" "ItemLayout" NOT NULL DEFAULT 'GRID',
    "gridColumns" INTEGER NOT NULL DEFAULT 4,
    "span" INTEGER NOT NULL DEFAULT 4,
    "bgColor" TEXT,
    "textColor" TEXT,
    "borderColor" TEXT,
    "textSize" INTEGER,

    CONSTRAINT "ChecklistSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "url" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "bgColor" TEXT,
    "textColor" TEXT,
    "borderColor" TEXT,
    "textSize" INTEGER,
    "fontFamily" TEXT,
    "pixelatedImage" BOOLEAN NOT NULL DEFAULT true,
    "imageFit" "ImageFit" NOT NULL DEFAULT 'CONTAIN',
    "imageScale" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "imagePositionX" INTEGER NOT NULL DEFAULT 50,
    "imagePositionY" INTEGER NOT NULL DEFAULT 50,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistCompletion" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "status" "CompletionStatus" NOT NULL DEFAULT 'PENDING',
    "completedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "cooldownWaivedAt" TIMESTAMP(3),

    CONSTRAINT "ChecklistCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaySession" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "notes" TEXT,
    "isManualEntry" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenTransaction" (
    "id" TEXT NOT NULL,
    "type" "TokenTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT,
    "actorId" TEXT NOT NULL,
    "completionId" TEXT,
    "gamePurchaseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamePurchase" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "gameId" TEXT,
    "purchasedById" TEXT NOT NULL,
    "tokenCost" INTEGER NOT NULL,
    "notes" TEXT,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GamePurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "completionId" TEXT,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Game_platform_idx" ON "Game"("platform");

-- CreateIndex
CREATE INDEX "Checklist_gameId_idx" ON "Checklist"("gameId");

-- CreateIndex
CREATE INDEX "ActiveChecklist_userId_idx" ON "ActiveChecklist"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ActiveChecklist_userId_checklistId_key" ON "ActiveChecklist"("userId", "checklistId");

-- CreateIndex
CREATE INDEX "ChecklistTab_checklistId_idx" ON "ChecklistTab"("checklistId");

-- CreateIndex
CREATE INDEX "ChecklistSection_tabId_idx" ON "ChecklistSection"("tabId");

-- CreateIndex
CREATE INDEX "ChecklistItem_sectionId_idx" ON "ChecklistItem"("sectionId");

-- CreateIndex
CREATE INDEX "ChecklistCompletion_checklistId_idx" ON "ChecklistCompletion"("checklistId");

-- CreateIndex
CREATE INDEX "ChecklistCompletion_status_idx" ON "ChecklistCompletion"("status");

-- CreateIndex
CREATE INDEX "PlaySession_checklistId_idx" ON "PlaySession"("checklistId");

-- CreateIndex
CREATE INDEX "PlaySession_userId_idx" ON "PlaySession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TokenTransaction_completionId_key" ON "TokenTransaction"("completionId");

-- CreateIndex
CREATE UNIQUE INDEX "TokenTransaction_gamePurchaseId_key" ON "TokenTransaction"("gamePurchaseId");

-- CreateIndex
CREATE INDEX "TokenTransaction_actorId_idx" ON "TokenTransaction"("actorId");

-- CreateIndex
CREATE INDEX "TokenTransaction_createdAt_idx" ON "TokenTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "GamePurchase_gameId_idx" ON "GamePurchase"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_key_key" ON "Badge"("key");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_completionId_key" ON "UserBadge"("completionId");

-- CreateIndex
CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");

-- AddForeignKey
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveChecklist" ADD CONSTRAINT "ActiveChecklist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveChecklist" ADD CONSTRAINT "ActiveChecklist_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTab" ADD CONSTRAINT "ChecklistTab_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistSection" ADD CONSTRAINT "ChecklistSection_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "ChecklistTab"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ChecklistSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistCompletion" ADD CONSTRAINT "ChecklistCompletion_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistCompletion" ADD CONSTRAINT "ChecklistCompletion_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistCompletion" ADD CONSTRAINT "ChecklistCompletion_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaySession" ADD CONSTRAINT "PlaySession_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaySession" ADD CONSTRAINT "PlaySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenTransaction" ADD CONSTRAINT "TokenTransaction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenTransaction" ADD CONSTRAINT "TokenTransaction_completionId_fkey" FOREIGN KEY ("completionId") REFERENCES "ChecklistCompletion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenTransaction" ADD CONSTRAINT "TokenTransaction_gamePurchaseId_fkey" FOREIGN KEY ("gamePurchaseId") REFERENCES "GamePurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePurchase" ADD CONSTRAINT "GamePurchase_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePurchase" ADD CONSTRAINT "GamePurchase_purchasedById_fkey" FOREIGN KEY ("purchasedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_completionId_fkey" FOREIGN KEY ("completionId") REFERENCES "ChecklistCompletion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

