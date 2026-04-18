-- ============================================================
-- Migration P9-M4: Add stat_total_zalo_clicked to flows table
-- Purpose : Separate ZNS/Zalo link-click stats from email click
--           stats so flow analytics can report them independently.
-- Safe    : ADD COLUMN IF NOT EXISTS → idempotent, safe to re-run.
-- ============================================================

ALTER TABLE `flows`
  ADD COLUMN IF NOT EXISTS `stat_total_zalo_clicked`  int(11) NOT NULL DEFAULT 0 COMMENT 'Total ZNS / Zalo CS link clicks'
    AFTER `stat_unique_clicked`,
  ADD COLUMN IF NOT EXISTS `stat_unique_zalo_clicked` int(11) NOT NULL DEFAULT 0 COMMENT 'Unique subscribers who clicked ZNS / Zalo CS links'
    AFTER `stat_total_zalo_clicked`;

-- Backfill: count existing 'click_zns' events from subscriber_activity
-- for each flow so historical data is not lost.
-- (click_zns is the type logged by tracking_processor.php for ZNS link clicks)
UPDATE `flows` f
  SET f.stat_total_zalo_clicked  = (
        SELECT COUNT(*)
        FROM   subscriber_activity sa
        WHERE  sa.flow_id = f.id
        AND    sa.type = 'click_zns'
      ),
      f.stat_unique_zalo_clicked = (
        SELECT COUNT(DISTINCT sa.subscriber_id)
        FROM   subscriber_activity sa
        WHERE  sa.flow_id = f.id
        AND    sa.type = 'click_zns'
      );

-- Verify result
SELECT
  id,
  SUBSTRING(name, 1, 40)   AS flow_name,
  stat_total_clicked,
  stat_total_zalo_clicked,
  stat_unique_zalo_clicked
FROM flows
WHERE stat_total_zalo_clicked > 0
ORDER BY stat_total_zalo_clicked DESC
LIMIT 20;
