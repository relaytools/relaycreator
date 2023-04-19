/*
  Warnings:

  - You are about to drop the column `serverId` on the `Relay` table. All the data in the column will be lost.
  - You are about to drop the `Server` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX `Relay_ownerId_serverId_idx` ON `Relay`;

-- AlterTable
ALTER TABLE `Relay` DROP COLUMN `serverId`,
    ADD COLUMN `capacity` INTEGER NULL,
    ADD COLUMN `ip` VARCHAR(255) NULL;

-- DropTable
DROP TABLE `Server`;

-- CreateTable
CREATE TABLE `WhiteList` (
    `id` VARCHAR(191) NOT NULL,
    `relayId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `WhiteList_relayId_key`(`relayId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BlackList` (
    `id` VARCHAR(191) NOT NULL,
    `relayId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `BlackList_relayId_key`(`relayId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ListEntryPubkey` (
    `id` VARCHAR(191) NOT NULL,
    `whiteListId` VARCHAR(191) NULL,
    `blackListId` VARCHAR(191) NULL,
    `pubkey` VARCHAR(255) NOT NULL,
    `reason` VARCHAR(255) NULL,
    `expires_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ListEntryKeyword` (
    `id` VARCHAR(191) NOT NULL,
    `whiteListId` VARCHAR(191) NULL,
    `blackListId` VARCHAR(191) NULL,
    `keyword` VARCHAR(255) NOT NULL,
    `reason` VARCHAR(255) NULL,
    `expires_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Relay_ownerId_idx` ON `Relay`(`ownerId`);
