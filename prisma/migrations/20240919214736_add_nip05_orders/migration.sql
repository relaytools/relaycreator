-- CreateTable
CREATE TABLE `Nip05Order` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(255) NOT NULL,
    `paid` BOOLEAN NOT NULL DEFAULT false,
    `payment_hash` VARCHAR(64) NOT NULL,
    `lnurl` VARCHAR(1024) NOT NULL,
    `expires_at` DATETIME(3) NULL,
    `paid_at` DATETIME(3) NULL,
    `amount` INTEGER NOT NULL DEFAULT 21000,
    `nip05Id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
