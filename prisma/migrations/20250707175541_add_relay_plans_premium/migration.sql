-- AlterTable
ALTER TABLE `ClientOrder` ADD COLUMN `order_type` VARCHAR(50) NOT NULL DEFAULT 'standard';

-- AlterTable
ALTER TABLE `Order` ADD COLUMN `order_type` VARCHAR(50) NOT NULL DEFAULT 'standard';

-- AlterTable
ALTER TABLE `Relay` ADD COLUMN `payment_premium_amount` INTEGER NOT NULL DEFAULT 2100;
