-- AlterTable
ALTER TABLE `ClientOrder` ADD COLUMN `amount` INTEGER NOT NULL DEFAULT 21;

-- AlterTable
ALTER TABLE `Order` ADD COLUMN `amount` INTEGER NOT NULL DEFAULT 21000;
