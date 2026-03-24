-- Migration: Add stat_zalo_sent column to flows table
-- FlowExecutor.php buffers 'stat_zalo_sent' for Zalo CS steps,
-- but the column was missing from the flows table (only stat_zns_sent existed).

ALTER TABLE `flows`
  ADD COLUMN `stat_zalo_sent` int(11) NOT NULL DEFAULT 0 COMMENT 'Total Zalo CS messages sent';
