-- CreateTable
CREATE TABLE `Stream` (
    `id` VARCHAR(191) NOT NULL,
    `relayId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(1024) NOT NULL,
    `direction` VARCHAR(255) NOT NULL,
    `internal` BOOLEAN NOT NULL DEFAULT false,
    `sync` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(1024) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
