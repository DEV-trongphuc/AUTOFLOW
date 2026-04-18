<?php
// api/rebuild_daily_stats.php - Rebuild aggregated stats after bot/device fix
require_once 'db_connect.php';

header('Content-Type: text/plain; charset=utf-8');
echo "=== REBUILD DAILY STATS (BOT-AWARE) ===\n\n";

try {
    $pdo->beginTransaction();

    // 1. Clear ALL old daily stats to ensure a clean slate
    $pdo->exec("DELETE FROM web_daily_stats");
    echo "Cleared all old daily stats\n\n";

    // 2. Get all combinations of Property + Date + Device
    $stmt = $pdo->query("
        SELECT DISTINCT 
            property_id, 
            DATE(started_at) as date,
            device_type
        FROM web_sessions
        ORDER BY property_id, date, device_type
    ");
    $groups = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Processing " . count($groups) . " groups...\n\n";

    foreach ($groups as $group) {
        $pid = $group['property_id'];
        $date = $group['date'];
        $device = $group['device_type'];

        // A. GLOBAL STATS
        $stmtStats = $pdo->prepare("
            SELECT 
                COUNT(DISTINCT visitor_id) as visitors,
                COUNT(*) as sessions,
                SUM(page_count) as page_views,
                SUM(duration_seconds) as total_duration,
                SUM(is_bounce) as bounces
            FROM web_sessions
            WHERE property_id = ? AND DATE(started_at) = ? AND device_type = ?
        ");
        $stmtStats->execute([$pid, $date, $device]);
        $stats = $stmtStats->fetch(PDO::FETCH_ASSOC);

        if ($stats['sessions'] > 0) {
            $pdo->prepare("
                INSERT INTO web_daily_stats 
                (property_id, url_hash, date, device_type, visitors, sessions, page_views, total_duration, bounces)
                VALUES (?, 'GLOBAL', ?, ?, ?, ?, ?, ?, ?)
            ")->execute([
                        $pid,
                        $date,
                        $device,
                        $stats['visitors'],
                        $stats['sessions'],
                        $stats['page_views'],
                        $stats['total_duration'],
                        $stats['bounces']
                    ]);
        }

        // B. PER-URL STATS for this group
        $stmtUrls = $pdo->prepare("
            SELECT 
                pv.url_hash,
                COUNT(*) as page_views,
                COUNT(DISTINCT pv.visitor_id) as visitors,
                COUNT(DISTINCT pv.session_id) as sessions,
                SUM(pv.time_on_page) as total_time,
                SUM(pv.scroll_depth) as total_scroll,
                COUNT(DISTINCT pv.id) as scroll_samples,
                SUM(s.is_bounce) as bounces 
            FROM web_page_views pv
            JOIN web_sessions s ON pv.session_id = s.id
            WHERE pv.property_id = ? AND DATE(pv.loaded_at) = ? AND s.device_type = ?
            GROUP BY pv.url_hash
        ");
        $stmtUrls->execute([$pid, $date, $device]);
        $urlRows = $stmtUrls->fetchAll(PDO::FETCH_ASSOC);

        foreach ($urlRows as $u) {
            $pdo->prepare("
                INSERT INTO web_daily_stats 
                (property_id, url_hash, date, device_type, page_views, visitors, sessions, total_duration, total_scroll, scroll_samples, bounces)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ")->execute([
                        $pid,
                        $u['url_hash'],
                        $date,
                        $device,
                        $u['page_views'],
                        $u['visitors'],
                        $u['sessions'],
                        $u['total_time'],
                        $u['total_scroll'],
                        $u['scroll_samples'],
                        $u['bounces']
                    ]);
        }

        // C. SOURCE STATS for this group
        // Fixed: Group by the generated key to avoid duplicate SRC:direct:none entries
        $stmtSrc = $pdo->prepare("
            SELECT 
                CONCAT('SRC:', COALESCE(utm_source, 'direct'), ':', COALESCE(utm_medium, 'none')) as src_key,
                COUNT(*) as sessions,
                COUNT(DISTINCT visitor_id) as visitors,
                SUM(is_bounce) as bounces
            FROM web_sessions
            WHERE property_id = ? AND DATE(started_at) = ? AND device_type = ?
            GROUP BY 1
        ");
        $stmtSrc->execute([$pid, $date, $device]);
        $srcRows = $stmtSrc->fetchAll(PDO::FETCH_ASSOC);

        foreach ($srcRows as $s) {
            $pdo->prepare("
                INSERT INTO web_daily_stats 
                (property_id, url_hash, date, device_type, sessions, visitors, bounces)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ")->execute([
                        $pid,
                        $s['src_key'],
                        $date,
                        $device,
                        $s['sessions'],
                        $s['visitors'],
                        $s['bounces']
                    ]);
        }

        echo "✓ $date | $device | sessions: {$stats['sessions']}\n";
    }

    $pdo->commit();
    echo "\n=== REBUILD COMPLETE ===\n";

} catch (Exception $e) {
    if ($pdo->inTransaction())
        $pdo->rollBack();
    echo "\n[ERROR] " . $e->getMessage() . "\n";
}