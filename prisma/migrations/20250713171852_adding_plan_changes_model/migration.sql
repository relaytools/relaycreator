-- CreateTable
CREATE TABLE `PlanChange` (
    `id` VARCHAR(191) NOT NULL,
    `relayId` VARCHAR(191) NOT NULL,
    `pubkey` VARCHAR(255) NOT NULL,
    `plan_type` VARCHAR(50) NOT NULL,
    `amount_paid` INTEGER NOT NULL,
    `started_at` DATETIME(3) NOT NULL,
    `ended_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `clientOrderId` VARCHAR(191) NULL,

    INDEX `PlanChange_relayId_pubkey_idx`(`relayId`, `pubkey`),
    INDEX `PlanChange_pubkey_started_at_idx`(`pubkey`, `started_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
