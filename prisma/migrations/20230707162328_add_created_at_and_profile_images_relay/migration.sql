-- AlterTable
ALTER TABLE `Relay` ADD COLUMN `banner_image` VARCHAR(2048) NULL,
    ADD COLUMN `created_at` DATETIME(3) NULL,
    ADD COLUMN `profile_image` VARCHAR(2048) NULL;
