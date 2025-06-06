-- DropForeignKey
ALTER TABLE "TextBlock" DROP CONSTRAINT "TextBlock_slideId_fkey";

-- AddForeignKey
ALTER TABLE "TextBlock" ADD CONSTRAINT "TextBlock_slideId_fkey" FOREIGN KEY ("slideId") REFERENCES "Slide"("id") ON DELETE CASCADE ON UPDATE CASCADE;
