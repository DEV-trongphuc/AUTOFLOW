<?php
/**
 * Debug Bounce Rate for a specific page
 * Usage: /mail_api/debug_bounce.php?url=https://ideas.edu.vn/swiss-umef-msc-ai
 */

require_once 'db_connect.php';
header('Content-Type: application/json');

$url = $_GET['url'] ?? '';
if (!$url) {
    echo json_encode(['error' => 'Missing url parameter']);
    exit;
}

try {
    // Clean URL (remove query params)
    $cleanUrl = explode('?', $url)[0];

    // Find all sessions that viewed this page
    $stmt = $pdo->prepare("
        SELECT 
            s.id as session_id,
            s.page_count,
            s.is_bounce,
            s.duration_seconds,
            pv.id as pageview_id,
            pv.url,
            (SELECT MIN(id) FROM web_page_views WHERE session_id = s.id) as first_pv_id,
            (SELECT COUNT(*) FROM web_events WHERE session_id = s.id AND event_type IN ('click', 'canvas_click', 'form')) as click_count
        FROM web_sessions s
        JOIN web_page_views pv ON s.id = pv.session_id
        WHERE pv.url LIKE ?
        ORDER BY s.id DESC
        LIMIT 20
    ");
    $stmt->execute([$cleanUrl . '%']);
    $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Analyze each session
    $analysis = [];
    $startedHere = 0;
    $bouncedHere = 0;

    foreach ($sessions as $session) {
        $isFirstPage = ($session['pageview_id'] == $session['first_pv_id']);
        $shouldBounce = ($session['page_count'] == 1 && $session['click_count'] == 0);

        if ($isFirstPage) {
            $startedHere++;
            if ($session['is_bounce'] == 1) {
                $bouncedHere++;
            }
        }

        $analysis[] = [
            'session_id' => $session['session_id'],
            'page_count' => (int) $session['page_count'],
            'is_bounce' => (int) $session['is_bounce'],
            'click_count' => (int) $session['click_count'],
            'duration' => (int) $session['duration_seconds'],
            'is_first_page' => $isFirstPage,
            'should_bounce' => $shouldBounce,
            'bounce_correct' => ($session['is_bounce'] == ($shouldBounce ? 1 : 0))
        ];
    }

    $bounceRate = $startedHere > 0 ? round(($bouncedHere / $startedHere) * 100, 2) : 0;

    echo json_encode([
        'url' => $cleanUrl,
        'total_sessions_viewed' => count($sessions),
        'sessions_started_here' => $startedHere,
        'sessions_bounced_here' => $bouncedHere,
        'calculated_bounce_rate' => $bounceRate . '%',
        'sessions' => $analysis
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>