-- Run in MySQL Workbench (as root or another user with CREATE privilege).
-- Then set server/.env and run: npm run dev

CREATE DATABASE IF NOT EXISTS aislevision
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE aislevision;

CREATE TABLE IF NOT EXISTS grocery_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  status ENUM('not_picked_up', 'picked_up') NOT NULL DEFAULT 'not_picked_up',
  PRIMARY KEY (id),
  KEY idx_grocery_items_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
