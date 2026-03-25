-- ========================================================
-- DATABASE SCHEMA PATCH - MISSING COLUMNS FIX
-- ========================================================
-- Run this script in your Railway SQL Console to fix 
-- "Unknown column" errors on the live server.
-- ========================================================

-- 1. Fixing 'batch_number' in inventory related tables (If already exists, use these lines only if needed)
-- ALTER TABLE `inventory_facility` ADD COLUMN `batch_number` VARCHAR(100) DEFAULT NULL AFTER `expiry_date`;
-- ALTER TABLE `inventory_warehouse` ADD COLUMN `batch_number` VARCHAR(100) DEFAULT NULL AFTER `expiry_date`;
-- ALTER TABLE `inventory_user` ADD COLUMN `batch_number` VARCHAR(100) DEFAULT NULL AFTER `expiry_date`;

-- 2. Fixing 'estimated_usage_duration' in requisition tables
-- For Facility Requisitions (Internal facility admin requests)
ALTER TABLE `facility_requisitions` ADD COLUMN `estimated_usage_duration` INT DEFAULT NULL AFTER `remarks`;

-- For User Requisitions (Normal user/staff requests)
ALTER TABLE `requisitions` ADD COLUMN `estimated_usage_duration` INT DEFAULT NULL AFTER `remarks`;

-- 3. Additional robustness: Ensure 'item_cost' and 'expiry_date' exist in inventory_facility
-- (Some old versions might be missing these if they were added later)
-- ALTER TABLE `inventory_facility` MODIFY COLUMN `item_cost` DECIMAL(10,2) DEFAULT NULL;
-- ALTER TABLE `inventory_facility` MODIFY COLUMN `expiry_date` DATE DEFAULT NULL;

-- ========================================================
-- SUCCESS: Your database should now match the latest code!
-- ========================================================
