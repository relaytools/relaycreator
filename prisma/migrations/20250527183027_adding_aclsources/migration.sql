-- CreateTable
CREATE TABLE `AclSource` (
    `id` VARCHAR(191) NOT NULL,
    `relayId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(1024) NOT NULL,
    `aclType` VARCHAR(128) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
