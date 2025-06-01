-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CREATER', 'EDITOR', 'VIEWER');

-- CreateTable
CREATE TABLE "Presentation" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "Presentation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "presentationId" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Slide" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "presentationId" TEXT NOT NULL,

    CONSTRAINT "Slide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TextBlock" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "slideId" TEXT NOT NULL,

    CONSTRAINT "TextBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slide" ADD CONSTRAINT "Slide_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TextBlock" ADD CONSTRAINT "TextBlock_slideId_fkey" FOREIGN KEY ("slideId") REFERENCES "Slide"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
