-- CreateTable
CREATE TABLE `ListEntryKind` (
    `id` VARCHAR(191) NOT NULL,
    `AllowListId` VARCHAR(191) NULL,
    `BlockListId` VARCHAR(191) NULL,
    `kind` INTEGER NOT NULL,
    `reason` VARCHAR(255) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
