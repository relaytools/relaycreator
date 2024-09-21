-- CreateTable
CREATE TABLE `Nip05` (
    `id` VARCHAR(191) NOT NULL,
    `pubkey` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `domain` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RelayUrl` (
    `id` VARCHAR(191) NOT NULL,
    `nip05Id` VARCHAR(191) NOT NULL,
    `relayId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,

    INDEX `RelayUrl_nip05Id_idx`(`nip05Id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
