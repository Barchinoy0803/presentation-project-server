/*
  Warnings:

  - You are about to alter the column `x` on the `TextBlock` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `y` on the `TextBlock` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - Added the required column `order` to the `Slide` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Slide` table without a default value. This is not possible if the table is not empty.
  - Added the required column `height` to the `TextBlock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `styles` to the `TextBlock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `TextBlock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `width` to the `TextBlock` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "TextBlock" DROP CONSTRAINT "TextBlock_slideId_fkey";

-- AlterTable
ALTER TABLE "Slide" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "order" INTEGER NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "TextBlock" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "height" INTEGER NOT NULL,
ADD COLUMN     "styles" JSONB NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "width" INTEGER NOT NULL,
ALTER COLUMN "x" SET DATA TYPE INTEGER,
ALTER COLUMN "y" SET DATA TYPE INTEGER;

-- AddForeignKey
ALTER TABLE "TextBlock" ADD CONSTRAINT "TextBlock_slideId_fkey" FOREIGN KEY ("slideId") REFERENCES "Slide"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
