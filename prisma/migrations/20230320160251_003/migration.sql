/*
  Warnings:

  - Added the required column `relayId` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Order` ADD COLUMN `relayId` VARCHAR(191) NOT NULL;
