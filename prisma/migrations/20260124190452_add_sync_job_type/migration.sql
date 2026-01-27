-- AlterTable
ALTER TABLE `Job` ADD COLUMN `syncDirection` VARCHAR(12) NULL,
    ADD COLUMN `syncHost` VARCHAR(255) NULL;
