/*
  Warnings:

  - You are about to drop the column `blackListId` on the `ListEntryKeyword` table. All the data in the column will be lost.
  - You are about to drop the column `whiteListId` on the `ListEntryKeyword` table. All the data in the column will be lost.
  - You are about to drop the column `blackListId` on the `ListEntryPubkey` table. All the data in the column will be lost.
  - You are about to drop the column `whiteListId` on the `ListEntryPubkey` table. All the data in the column will be lost.
  - You are about to drop the `BlackList` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WhiteList` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE `ListEntryKeyword` DROP COLUMN `blackListId`,
    DROP COLUMN `whiteListId`,
    ADD COLUMN `AllowListId` VARCHAR(191) NULL,
    ADD COLUMN `BlockListId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ListEntryPubkey` DROP COLUMN `blackListId`,
    DROP COLUMN `whiteListId`,
    ADD COLUMN `AllowListId` VARCHAR(191) NULL,
    ADD COLUMN `BlockListId` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `BlackList`;

-- DropTable
DROP TABLE `WhiteList`;

-- CreateTable
CREATE TABLE `AllowList` (
    `id` VARCHAR(191) NOT NULL,
    `relayId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `AllowList_relayId_key`(`relayId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BlockList` (
    `id` VARCHAR(191) NOT NULL,
    `relayId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `BlockList_relayId_key`(`relayId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
