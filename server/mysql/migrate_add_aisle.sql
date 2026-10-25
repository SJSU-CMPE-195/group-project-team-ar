-- Add aisle support to an existing AisleVision database.
-- This migration is safe to run more than once. Existing grocery items and
-- their pickup statuses are preserved.

USE aislevision;

DELIMITER $$

DROP PROCEDURE IF EXISTS migrate_add_aisle_column $$

CREATE PROCEDURE migrate_add_aisle_column()
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'grocery_items'
      AND COLUMN_NAME = 'aisle'
  ) THEN
    ALTER TABLE grocery_items
      ADD COLUMN aisle VARCHAR(16) NULL AFTER name;
  END IF;

  UPDATE grocery_items
  SET aisle = CASE LOWER(TRIM(name))
    WHEN 'banana' THEN 'B9'
    WHEN 'bottle' THEN 'B68'
    WHEN 'fork' THEN 'E73'
    WHEN 'scissors' THEN 'A23'
    WHEN 'potted plant' THEN 'E28'
    ELSE aisle
  END
  WHERE LOWER(TRIM(name)) IN ('banana', 'bottle', 'fork', 'scissors', 'potted plant');
END $$

CALL migrate_add_aisle_column() $$

DROP PROCEDURE migrate_add_aisle_column $$

DELIMITER ;
