-- =====================================================
-- WEB TRACKING PERFORMANCE OPTIMIZATION INDEXES
-- Target: 1M events/day (300M events/year)
-- =====================================================

-- Run this script to create all critical indexes
-- Estimated execution time: 5-15 minutes depending on data volume

SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='TRADITIONAL';

-- =====================================================
-- 1. WEB_VISITORS INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_visitors_property_time 
ON web_visitors(property_id, last_visit_at);

CREATE INDEX IF NOT EXISTS idx_visitors_subscriber 
ON web_visitors(subscriber_id) 
WHERE subscriber_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_visitors_ip 
ON web_visitors(ip_address);

-- =====================================================
-- 2. WEB_SESSIONS INDEXES (Critical for performance)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_sessions_property_time 
ON web_sessions(property_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_visitor_time 
ON web_sessions(visitor_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_device 
ON web_sessions(property_id, device_type, started_at);

CREATE INDEX IF NOT EXISTS idx_sessions_utm_source 
ON web_sessions(property_id, utm_source, utm_medium, started_at);

CREATE INDEX IF NOT EXISTS idx_sessions_os 
ON web_sessions(property_id, os, started_at);

-- =====================================================
-- 3. WEB_PAGE_VIEWS INDEXES (Most queried table)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_pageviews_property_time 
ON web_page_views(property_id, loaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_pageviews_session 
ON web_page_views(session_id, loaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_pageviews_url_hash_time 
ON web_page_views(property_id, url_hash, loaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_pageviews_visitor 
ON web_page_views(visitor_id, loaded_at DESC);

-- Covering index for common queries
CREATE INDEX IF NOT EXISTS idx_pageviews_covering 
ON web_page_views(property_id, url_hash, loaded_at, time_on_page, scroll_depth);

-- =====================================================
-- 4. WEB_EVENTS INDEXES (Highest volume table)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_events_property_time 
ON web_events(property_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_type_time 
ON web_events(property_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_url 
ON web_events(property_id, url, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_pageview 
ON web_events(page_view_id);

CREATE INDEX IF NOT EXISTS idx_events_visitor 
ON web_events(visitor_id, created_at DESC);

-- Covering index for event aggregation queries
CREATE INDEX IF NOT EXISTS idx_events_covering 
ON web_events(property_id, event_type, created_at, target_text, url);

-- =====================================================
-- 5. WEB_DAILY_STATS INDEXES (Aggregation table)
-- =====================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_stats_unique 
ON web_daily_stats(date, property_id, url_hash);

CREATE INDEX IF NOT EXISTS idx_daily_stats_property_date 
ON web_daily_stats(property_id, date DESC);

-- =====================================================
-- 6. ANALYZE TABLES (Update statistics)
-- =====================================================
ANALYZE TABLE web_visitors;
ANALYZE TABLE web_sessions;
ANALYZE TABLE web_page_views;
ANALYZE TABLE web_events;
ANALYZE TABLE web_daily_stats;

-- =====================================================
-- 7. VERIFY INDEXES
-- =====================================================
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    SEQ_IN_INDEX,
    CARDINALITY
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('web_visitors', 'web_sessions', 'web_page_views', 'web_events', 'web_daily_stats')
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. Run this during off-peak hours (indexes can lock tables)
-- 2. Monitor disk space (indexes require additional storage)
-- 3. After creating indexes, run ANALYZE TABLE to update statistics
-- 4. Use EXPLAIN on slow queries to verify index usage
-- 5. Consider partitioning for tables > 10M rows

-- =====================================================
-- PERFORMANCE TESTING
-- =====================================================
-- Test query performance before/after indexes:

-- Example 1: Top pages query
EXPLAIN SELECT url, COUNT(*) as views 
FROM web_page_views 
WHERE property_id = 'your-property-id' 
AND loaded_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY url 
ORDER BY views DESC 
LIMIT 20;

-- Example 2: Event aggregation
EXPLAIN SELECT event_type, COUNT(*) as count 
FROM web_events 
WHERE property_id = 'your-property-id' 
AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY event_type;

-- Example 3: Session stats
EXPLAIN SELECT 
    COUNT(DISTINCT visitor_id) as visitors,
    COUNT(*) as sessions
FROM web_sessions 
WHERE property_id = 'your-property-id' 
AND started_at >= DATE_SUB(NOW(), INTERVAL 30 DAY);

-- =====================================================
-- Expected Results:
-- - All queries should use indexes (type = 'ref' or 'range')
-- - No full table scans (type != 'ALL')
-- - Rows examined should be < 10% of total rows
-- =====================================================
