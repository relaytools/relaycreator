-- AlterTable
ALTER TABLE `Relay` ADD COLUMN `request_payment` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `request_payment_amount` INTEGER NOT NULL DEFAULT 1000;
