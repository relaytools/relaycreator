-- AlterTable
ALTER TABLE `Relay` ADD COLUMN `is_external` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `is_proxied` BOOLEAN NOT NULL DEFAULT false;
