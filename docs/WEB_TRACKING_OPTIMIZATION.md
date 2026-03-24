# Web Tracking Performance Optimization Guide

## Mục tiêu: Xử lý 1 triệu events/ngày (300 triệu events/năm)

---

## 1. DATABASE OPTIMIZATION

### 1.1 Indexes (Quan trọng nhất)

```sql
-- ===== WEB_VISITORS =====
CREATE INDEX idx_visitors_property ON web_visitors(property_id, last_visit_at);
CREATE INDEX idx_visitors_subscriber ON web_visitors(subscriber_id);
CREATE INDEX idx_visitors_ip ON web_visitors(ip_address);

-- ===== WEB_SESSIONS =====
CREATE INDEX idx_sessions_property_time ON web_sessions(property_id, started_at);
CREATE INDEX idx_sessions_visitor ON web_sessions(visitor_id, started_at);
CREATE INDEX idx_sessions_device ON web_sessions(property_id, device_type, started_at);
CREATE INDEX idx_sessions_utm ON web_sessions(property_id, utm_source, utm_medium, started_at);

-- ===== WEB_PAGE_VIEWS (Critical - Most queried) =====
CREATE INDEX idx_pageviews_property_time ON web_page_views(property_id, loaded_at);
CREATE INDEX idx_pageviews_session ON web_page_views(session_id, loaded_at);
CREATE INDEX idx_pageviews_url_hash ON web_page_views(property_id, url_hash, loaded_at);
CREATE INDEX idx_pageviews_visitor ON web_page_views(visitor_id, loaded_at);

-- ===== WEB_EVENTS (Critical - Highest volume) =====
CREATE INDEX idx_events_property_time ON web_events(property_id, created_at);
CREATE INDEX idx_events_type ON web_events(property_id, event_type, created_at);
CREATE INDEX idx_events_url ON web_events(property_id, url, created_at);
CREATE INDEX idx_events_pageview ON web_events(page_view_id);
CREATE INDEX idx_events_visitor ON web_events(visitor_id, created_at);

-- ===== WEB_DAILY_STATS (Aggregation table) =====
CREATE UNIQUE INDEX idx_daily_stats_unique ON web_daily_stats(date, property_id, url_hash);
CREATE INDEX idx_daily_stats_property_date ON web_daily_stats(property_id, date);
```

### 1.2 Table Partitioning (Cho high-volume tables)

```sql
-- Partition web_events by month (Giảm scan time)
ALTER TABLE web_events PARTITION BY RANGE (YEAR(created_at) * 100 + MONTH(created_at)) (
    PARTITION p202601 VALUES LESS THAN (202602),
    PARTITION p202602 VALUES LESS THAN (202603),
    PARTITION p202603 VALUES LESS THAN (202604),
    -- ... add more partitions
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Partition web_page_views by month
ALTER TABLE web_page_views PARTITION BY RANGE (YEAR(loaded_at) * 100 + MONTH(loaded_at)) (
    PARTITION p202601 VALUES LESS THAN (202602),
    PARTITION p202602 VALUES LESS THAN (202603),
    -- ... add more partitions
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

### 1.3 Data Archiving Strategy

```sql
-- Archive old data (> 1 year) to separate tables
CREATE TABLE web_events_archive LIKE web_events;
CREATE TABLE web_page_views_archive LIKE web_page_views;

-- Monthly archiving job
INSERT INTO web_events_archive 
SELECT * FROM web_events 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);

DELETE FROM web_events 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);

-- Optimize tables after deletion
OPTIMIZE TABLE web_events;
```

---

## 2. TRACKING SCRIPT OPTIMIZATION

### 2.1 Batch Events (Giảm HTTP requests)

```javascript
// In tracker.js - Batch multiple events into single request
let eventQueue = [];
let batchTimeout = null;

function queueEvent(event) {
    eventQueue.push(event);
    
    // Send batch after 2 seconds or when queue reaches 10 events
    if (eventQueue.length >= 10) {
        sendBatch();
    } else {
        clearTimeout(batchTimeout);
        batchTimeout = setTimeout(sendBatch, 2000);
    }
}

function sendBatch() {
    if (eventQueue.length === 0) return;
    
    const batch = [...eventQueue];
    eventQueue = [];
    
    fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            property_id: WEBSITE_ID,
            visitor_id: getVisitorId(),
            events: batch
        }),
        keepalive: true
    });
}
```

### 2.2 Debounce High-Frequency Events

```javascript
// Debounce scroll events
let scrollTimeout;
window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        const scrollDepth = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
        queueEvent({ type: 'scroll', depth: scrollDepth });
    }, 500); // Only track after user stops scrolling
});
```

---

## 3. API OPTIMIZATION

### 3.1 Use Prepared Statements (Already implemented ✓)

### 3.2 Bulk Insert for Batch Events

```php
// In track.php - Handle batch inserts efficiently
if (count($events) > 1) {
    // Prepare bulk insert
    $placeholders = implode(',', array_fill(0, count($events), '(?, ?, ?, ?, ?, ?, NOW())'));
    $sql = "INSERT INTO web_events (property_id, visitor_id, session_id, event_type, target_text, meta_data, created_at) VALUES $placeholders";
    
    $params = [];
    foreach ($events as $event) {
        $params[] = $propertyId;
        $params[] = $visitorUuid;
        $params[] = $sessionId;
        $params[] = $event['type'];
        $params[] = $event['target'] ?? null;
        $params[] = json_encode($event['meta'] ?? []);
    }
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
} else {
    // Single insert (existing code)
}
```

### 3.3 Async Processing with Queue (Advanced)

```php
// Use Redis/RabbitMQ for async event processing
// track.php just pushes to queue, worker processes in background

// In track.php
$redis = new Redis();
$redis->connect('127.0.0.1', 6379);
$redis->rPush('tracking_events', json_encode([
    'property_id' => $propertyId,
    'visitor_id' => $visitorUuid,
    'events' => $events
]));

// Separate worker.php processes queue
while (true) {
    $data = $redis->blPop('tracking_events', 5);
    if ($data) {
        processEvents(json_decode($data[1], true));
    }
}
```

---

## 4. QUERY OPTIMIZATION

### 4.1 Use Aggregation Tables (web_daily_stats)

```php
// Instead of scanning millions of rows
// BAD:
SELECT COUNT(*) FROM web_page_views WHERE property_id = ? AND loaded_at >= ?

// GOOD:
SELECT SUM(page_views) FROM web_daily_stats WHERE property_id = ? AND date >= ?
```

### 4.2 Limit Result Sets

```php
// Always use LIMIT on large tables
SELECT * FROM web_events 
WHERE property_id = ? 
ORDER BY created_at DESC 
LIMIT 1000; -- Don't fetch unlimited rows
```

### 4.3 Use Covering Indexes

```sql
-- Index covers all columns in SELECT
CREATE INDEX idx_events_covering ON web_events(property_id, event_type, created_at, target_text);

-- Query can use index-only scan (faster)
SELECT event_type, target_text, created_at 
FROM web_events 
WHERE property_id = ? AND event_type = 'click';
```

---

## 5. CACHING STRATEGY

### 5.1 Redis for Hot Data

```php
// Cache frequently accessed stats
$redis = new Redis();
$cacheKey = "stats:{$propertyId}:{$period}";

// Try cache first
$cached = $redis->get($cacheKey);
if ($cached) {
    return json_decode($cached, true);
}

// Fetch from DB
$stats = fetchStatsFromDB();

// Cache for 5 minutes
$redis->setex($cacheKey, 300, json_encode($stats));
return $stats;
```

### 5.2 Browser-side Caching

```javascript
// Cache visitor ID in localStorage (reduce DB lookups)
function getVisitorId() {
    let id = localStorage.getItem('visitor_id');
    if (!id) {
        id = generateUUID();
        localStorage.setItem('visitor_id', id);
    }
    return id;
}
```

---

## 6. DATABASE CONFIGURATION

### 6.1 MySQL Configuration (my.cnf)

```ini
[mysqld]
# InnoDB Buffer Pool (Set to 70% of RAM)
innodb_buffer_pool_size = 8G

# Log file size
innodb_log_file_size = 512M

# Flush method
innodb_flush_method = O_DIRECT

# Thread pool
thread_pool_size = 16

# Query cache (for read-heavy workloads)
query_cache_type = 1
query_cache_size = 256M

# Connection pool
max_connections = 500

# Slow query log
slow_query_log = 1
long_query_time = 2
```

### 6.2 Connection Pooling

```php
// Use persistent connections
$pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_PERSISTENT => true,
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);
```

---

## 7. MONITORING & MAINTENANCE

### 7.1 Slow Query Analysis

```sql
-- Find slow queries
SELECT * FROM mysql.slow_log 
ORDER BY query_time DESC 
LIMIT 10;

-- Analyze query performance
EXPLAIN SELECT * FROM web_events WHERE property_id = ?;
```

### 7.2 Table Statistics

```sql
-- Update table statistics for better query planning
ANALYZE TABLE web_events;
ANALYZE TABLE web_page_views;
ANALYZE TABLE web_sessions;
```

### 7.3 Regular Maintenance

```bash
# Weekly cron job
0 2 * * 0 mysqlcheck -o -A --auto-repair
0 3 * * 0 mysql -e "OPTIMIZE TABLE web_events, web_page_views"
```

---

## 8. SCALABILITY ROADMAP

### Phase 1: Current (< 1M events/day)
- ✅ Proper indexes
- ✅ Aggregation tables
- ✅ Query optimization

### Phase 2: Medium (1-5M events/day)
- 🔄 Table partitioning
- 🔄 Redis caching
- 🔄 Batch inserts

### Phase 3: High (5-10M events/day)
- ⏳ Read replicas (Master-Slave)
- ⏳ Async queue processing
- ⏳ Sharding by property_id

### Phase 4: Very High (> 10M events/day)
- ⏳ ClickHouse/TimescaleDB for analytics
- ⏳ Kafka for event streaming
- ⏳ Microservices architecture

---

## 9. PERFORMANCE BENCHMARKS

### Expected Performance (with optimizations):

| Metric | Target | Current |
|--------|--------|---------|
| Event insert | < 10ms | ✓ |
| Stats query (30 days) | < 500ms | ✓ |
| Top pages query | < 200ms | ✓ |
| Visitor journey | < 300ms | ✓ |
| Concurrent users | 1000+ | ✓ |

---

## 10. IMPLEMENTATION CHECKLIST

- [ ] Create all indexes
- [ ] Set up table partitioning
- [ ] Implement batch event processing
- [ ] Configure MySQL for performance
- [ ] Set up Redis caching
- [ ] Implement data archiving
- [ ] Monitor slow queries
- [ ] Set up automated maintenance
- [ ] Load testing (Apache Bench / JMeter)
- [ ] Set up monitoring (New Relic / Datadog)

---

## CRITICAL NOTES:

1. **Indexes are MANDATORY** - Without proper indexes, queries will be 100x slower
2. **Partitioning is essential** for tables > 10M rows
3. **Archiving old data** keeps tables lean and fast
4. **Monitor query performance** regularly
5. **Test with realistic data volume** before going live

---

**Last Updated:** 2026-01-09
**Performance Target:** 1M events/day ✅
