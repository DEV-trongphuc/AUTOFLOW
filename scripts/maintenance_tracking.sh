#!/bin/bash

# =====================================================
# Web Tracking Maintenance Script
# Purpose: Archive old data and optimize tables
# Schedule: Run weekly via cron
# =====================================================

# Configuration
DB_HOST="localhost"
DB_NAME="your_database"
DB_USER="your_user"
DB_PASS="your_password"
ARCHIVE_MONTHS=12  # Archive data older than 12 months
LOG_FILE="/var/log/tracking_maintenance.log"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "========================================="
log "Starting Web Tracking Maintenance"
log "========================================="

# =====================================================
# 1. ARCHIVE OLD EVENTS (> 12 months)
# =====================================================
log "Step 1: Archiving old events..."

mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" <<EOF
-- Create archive table if not exists
CREATE TABLE IF NOT EXISTS web_events_archive LIKE web_events;

-- Move old events to archive
INSERT IGNORE INTO web_events_archive 
SELECT * FROM web_events 
WHERE created_at < DATE_SUB(NOW(), INTERVAL $ARCHIVE_MONTHS MONTH);

-- Delete archived events from main table
DELETE FROM web_events 
WHERE created_at < DATE_SUB(NOW(), INTERVAL $ARCHIVE_MONTHS MONTH);

SELECT ROW_COUNT() as archived_events;
EOF

log "Events archived successfully"

# =====================================================
# 2. ARCHIVE OLD PAGE VIEWS
# =====================================================
log "Step 2: Archiving old page views..."

mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" <<EOF
CREATE TABLE IF NOT EXISTS web_page_views_archive LIKE web_page_views;

INSERT IGNORE INTO web_page_views_archive 
SELECT * FROM web_page_views 
WHERE loaded_at < DATE_SUB(NOW(), INTERVAL $ARCHIVE_MONTHS MONTH);

DELETE FROM web_page_views 
WHERE loaded_at < DATE_SUB(NOW(), INTERVAL $ARCHIVE_MONTHS MONTH);

SELECT ROW_COUNT() as archived_pageviews;
EOF

log "Page views archived successfully"

# =====================================================
# 3. OPTIMIZE TABLES
# =====================================================
log "Step 3: Optimizing tables..."

mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" <<EOF
OPTIMIZE TABLE web_events;
OPTIMIZE TABLE web_page_views;
OPTIMIZE TABLE web_sessions;
OPTIMIZE TABLE web_visitors;
OPTIMIZE TABLE web_daily_stats;
EOF

log "Tables optimized successfully"

# =====================================================
# 4. UPDATE TABLE STATISTICS
# =====================================================
log "Step 4: Updating table statistics..."

mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" <<EOF
ANALYZE TABLE web_events;
ANALYZE TABLE web_page_views;
ANALYZE TABLE web_sessions;
ANALYZE TABLE web_visitors;
ANALYZE TABLE web_daily_stats;
EOF

log "Statistics updated successfully"

# =====================================================
# 5. CHECK TABLE SIZES
# =====================================================
log "Step 5: Checking table sizes..."

mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" <<EOF
SELECT 
    TABLE_NAME,
    ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) AS 'Size (MB)',
    TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = '$DB_NAME'
AND TABLE_NAME LIKE 'web_%'
ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC;
EOF

# =====================================================
# 6. CLEANUP OLD SESSIONS (> 30 days inactive)
# =====================================================
log "Step 6: Cleaning up old sessions..."

mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" <<EOF
DELETE FROM web_sessions 
WHERE started_at < DATE_SUB(NOW(), INTERVAL $ARCHIVE_MONTHS MONTH);

SELECT ROW_COUNT() as deleted_sessions;
EOF

log "Old sessions cleaned up"

# =====================================================
# 7. VACUUM ANALYZE (PostgreSQL) or OPTIMIZE (MySQL)
# =====================================================
log "Step 7: Final optimization..."

mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
    OPTIMIZE TABLE web_events, web_page_views, web_sessions, web_visitors;
"

log "========================================="
log "Maintenance completed successfully"
log "========================================="

# =====================================================
# 8. SEND NOTIFICATION (Optional)
# =====================================================
# Uncomment to send email notification
# echo "Maintenance completed at $(date)" | mail -s "Tracking Maintenance Report" admin@example.com

exit 0
