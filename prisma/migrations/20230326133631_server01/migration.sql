-- DropIndex
DROP INDEX `Relay_ownerId_idx` ON `Relay`;

-- AlterTable
ALTER TABLE `Relay` ADD COLUMN `serverId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Server` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `ip` VARCHAR(255) NOT NULL,
    `port` INTEGER NOT NULL,
    `capacity` INTEGER NOT NULL,

    INDEX `Server_id_idx`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Relay_ownerId_serverId_idx` ON `Relay`(`ownerId`, `serverId`);

-- CreateIndex
CREATE INDEX `User_id_idx` ON `User`(`id`);
