-- CreateTable
CREATE TABLE `RelayPlanChange` (
    `id` VARCHAR(191) NOT NULL,
    `relayId` VARCHAR(191) NOT NULL,
    `plan_type` VARCHAR(50) NOT NULL,
    `amount_paid` INTEGER NOT NULL,
    `started_at` DATETIME(3) NOT NULL,
    `ended_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `orderId` VARCHAR(191) NULL,

    INDEX `RelayPlanChange_relayId_idx`(`relayId`),
    INDEX `RelayPlanChange_relayId_started_at_idx`(`relayId`, `started_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
