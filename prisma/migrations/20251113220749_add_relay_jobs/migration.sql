-- CreateTable
CREATE TABLE `Job` (
    `id` VARCHAR(191) NOT NULL,
    `relayId` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(50) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `error_msg` TEXT NULL,
    `output` TEXT NULL,
    `pubkey` VARCHAR(255) NULL,
    `eventId` VARCHAR(255) NULL,

    INDEX `Job_relayId_idx`(`relayId`),
    INDEX `Job_status_idx`(`status`),
    INDEX `Job_kind_idx`(`kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
