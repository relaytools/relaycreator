/*
  Warnings:

  - You are about to drop the column `port` on the `Server` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Relay` ADD COLUMN `port` INTEGER NULL,
    ADD COLUMN `status` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `Server` DROP COLUMN `port`;
