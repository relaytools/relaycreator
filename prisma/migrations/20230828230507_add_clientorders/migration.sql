-- CreateTable
CREATE TABLE `ClientOrder` (
    `id` VARCHAR(191) NOT NULL,
    `relayId` VARCHAR(191) NOT NULL,
    `pubkey` VARCHAR(255) NOT NULL,
    `paid` BOOLEAN NOT NULL DEFAULT false,
    `payment_hash` VARCHAR(64) NOT NULL,
    `lnurl` VARCHAR(1024) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `paid_at` DATETIME(3) NOT NULL,

    INDEX `ClientOrder_relayId_idx`(`relayId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
