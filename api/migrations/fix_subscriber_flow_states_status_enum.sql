-- Migration: Fix subscriber_flow_states status ENUM
-- Add 'unsubscribed' value to status ENUM
-- Run this on existing databases to fix the missing enum value

ALTER TABLE `subscriber_flow_states`
  MODIFY COLUMN `status` 
  ENUM('waiting','processing','completed','failed','unsubscribed') 
  DEFAULT 'waiting';
