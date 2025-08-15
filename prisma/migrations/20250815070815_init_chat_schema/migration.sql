/*
  Warnings:

  - You are about to drop the column `recipientId` on the `Message` table. All the data in the column will be lost.
  - Added the required column `conversationId` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."ConversationType" AS ENUM ('DIRECT', 'GROUP', 'AI');

-- CreateEnum
CREATE TYPE "public"."ParticipantRole" AS ENUM ('MEMBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."MessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE', 'VOICE');

-- CreateEnum
CREATE TYPE "public"."MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');

-- DropForeignKey
ALTER TABLE "public"."Message" DROP CONSTRAINT "Message_recipientId_fkey";

-- AlterTable
ALTER TABLE "public"."Message" DROP COLUMN "recipientId",
ADD COLUMN     "conversationId" TEXT NOT NULL,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "mediaUrl" TEXT,
ADD COLUMN     "replyToMessageId" TEXT,
ADD COLUMN     "status" "public"."MessageStatus" NOT NULL DEFAULT 'SENT',
ADD COLUMN     "type" "public"."MessageType" NOT NULL DEFAULT 'TEXT',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "text" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "avatarUrl" TEXT;

-- CreateTable
CREATE TABLE "public"."Conversation" (
    "id" TEXT NOT NULL,
    "type" "public"."ConversationType" NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Participant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "public"."ParticipantRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conversation_type_idx" ON "public"."Conversation"("type");

-- CreateIndex
CREATE INDEX "Conversation_updatedAt_idx" ON "public"."Conversation"("updatedAt");

-- CreateIndex
CREATE INDEX "Participant_conversationId_idx" ON "public"."Participant"("conversationId");

-- CreateIndex
CREATE INDEX "Participant_userId_idx" ON "public"."Participant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_userId_conversationId_key" ON "public"."Participant"("userId", "conversationId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "public"."Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_senderId_createdAt_idx" ON "public"."Message"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_replyToMessageId_idx" ON "public"."Message"("replyToMessageId");

-- CreateIndex
CREATE INDEX "Message_status_idx" ON "public"."Message"("status");

-- AddForeignKey
ALTER TABLE "public"."Participant" ADD CONSTRAINT "Participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Participant" ADD CONSTRAINT "Participant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_replyToMessageId_fkey" FOREIGN KEY ("replyToMessageId") REFERENCES "public"."Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
