-- Migration: queue_throttle table for aggregate_daily rate limiting
-- Run once on production DB

CREATE TABLE IF NOT EXISTS `queue_throttle` (
    `throttle_key` VARCHAR(120) NOT NULL,
    `created_at`   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`throttle_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Auto-cleanup: delete entries older than 1 hour (via event or cron)
-- Or rely on the key being unique per 5-min window — old entries are harmless.

-- Optional: add event to auto-purge hourly
-- CREATE EVENT IF NOT EXISTS cleanup_queue_throttle
--   ON SCHEDULE EVERY 1 HOUR
--   DO DELETE FROM queue_throttle WHERE created_at < NOW() - INTERVAL 2 HOUR;
