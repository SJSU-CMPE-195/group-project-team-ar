-- ONLY if your grocery_items table still has a created_at column from an older setup.
-- Run once in Workbench against aislevision, then restart the Node server.

USE aislevision;

ALTER TABLE grocery_items DROP COLUMN created_at;
