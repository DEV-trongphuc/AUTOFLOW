-- Database Migration Script - Phase 3 Audit

-- 1. IP Hashing (Privacy / GDPR Compliance)
-- Convert any existing plain-text IPs to MD5 to ensure we don't store PII directly.
-- Using LENGTH < 32 to ensure we don't double hash an already hashed IP.
UPDATE `web_visitors` SET `ip_address` = MD5(`ip_address`) WHERE LENGTH(`ip_address`) < 32 AND `ip_address` IS NOT NULL;
UPDATE `api_rate_limits` SET `ip_address` = MD5(`ip_address`) WHERE LENGTH(`ip_address`) < 32 AND `ip_address` IS NOT NULL;
UPDATE `web_blacklist` SET `ip_address` = MD5(`ip_address`) WHERE LENGTH(`ip_address`) < 32 AND `ip_address` IS NOT NULL;
UPDATE `subscribers` SET `last_ip` = MD5(`last_ip`) WHERE LENGTH(`last_ip`) < 32 AND `last_ip` IS NOT NULL;

-- 2. Optimize DB Queries for Tracking Data Loading
-- Set up proper atomic index structures
-- Use IF NOT EXISTS syntax workaround (for MariaDB 10.6.18) by trying to execute standard add index command. 
-- Note: MySQL/MariaDB standard doesn't support 'IF NOT EXISTS' for indexes universally. The robust way is manual check.
-- Assuming these tables might lack basic compound indexes.
CREATE INDEX `idx_web_pv_session_visitor` ON `web_page_views`(`session_id`, `visitor_id`);
CREATE INDEX `idx_web_ev_session_type` ON `web_events`(`session_id`, `event_type`);

-- 3. Structure preparation
ALTER TABLE `api_rate_limits` MODIFY COLUMN `ip_address` VARCHAR(64) NOT NULL;
ALTER TABLE `web_visitors` MODIFY COLUMN `ip_address` VARCHAR(64) DEFAULT NULL;
ALTER TABLE `web_blacklist` MODIFY COLUMN `ip_address` VARCHAR(64) NOT NULL;
ALTER TABLE `subscribers` MODIFY COLUMN `last_ip` VARCHAR(64) DEFAULT NULL;
