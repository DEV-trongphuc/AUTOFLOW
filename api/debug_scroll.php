<?php
/**
 * Debug Scroll Depth Data
 * Usage: /mail_api/debug_scroll.php?url=https://ideas.edu.vn/swiss-umef-msc-ai
 */

require_once 'db_connect.php';
header('Content-Type: application/json');

$url = $_GET['url'] ?? '';
if (!$url) {
    echo json_encode(['error' => 'Missing url parameter']);
    exit;
}

try {
    $cleanUrl = explode('?', $url)[0];

    // Check pageviews scroll data
    $stmt = $pdo->prepare("
        SELECT 
            pv.id,
            pv.url,
            pv.scroll_depth,
            pv.time_on_page,
            s.id as session_id,
            s.page_count
        FROM web_page_views pv
        JOIN web_sessions s ON pv.session_id = s.id
        WHERE pv.url LIKE ?
        ORDER BY pv.id DESC
        LIMIT 20
    ");
    $stmt->execute([$cleanUrl . '%']);
    $pageviews = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Check scroll events
    $stmtEvents = $pdo->prepare("
        SELECT 
            e.id,
            e.event_type,
            e.target_text as scroll_percent,
            e.meta_data,
            e.created_at
        FROM web_events e
        JOIN web_page_views pv ON e.page_view_id = pv.id
        WHERE pv.url LIKE ?
        AND e.event_type = 'scroll'
        ORDER BY e.id DESC
        LIMIT 20
    ");
    $stmtEvents->execute([$cleanUrl . '%']);
    $scrollEvents = $stmtEvents->fetchAll(PDO::FETCH_ASSOC);

    // Calculate average
    $totalScroll = 0;
    $count = 0;
    foreach ($pageviews as $pv) {
        if ($pv['scroll_depth'] > 0) {
            $totalScroll += $pv['scroll_depth'];
            $count++;
        }
    }

    $avgScroll = $count > 0 ? round($totalScroll / $count, 2) : 0;

    echo json_encode([
        'url' => $cleanUrl,
        'pageviews_count' => count($pageviews),
        'scroll_events_count' => count($scrollEvents),
        'avg_scroll_depth' => $avgScroll . '%',
        'pageviews' => $pageviews,
        'scroll_events' => $scrollEvents
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>