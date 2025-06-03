/*
  Warnings:

  - You are about to drop the column `presentationId` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_presentationId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "presentationId";

-- CreateTable
CREATE TABLE "_UserPresentations" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserPresentations_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UserPresentations_B_index" ON "_UserPresentations"("B");

-- AddForeignKey
ALTER TABLE "Presentation" ADD CONSTRAINT "Presentation_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserPresentations" ADD CONSTRAINT "_UserPresentations_A_fkey" FOREIGN KEY ("A") REFERENCES "Presentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserPresentations" ADD CONSTRAINT "_UserPresentations_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
