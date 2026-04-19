<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once 'db_connect.php';
require_once 'auth_middleware.php';

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'list') {
        $stmt = $pdo->query("SELECT * FROM web_properties ORDER BY created_at DESC");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } elseif ($action === 'stats') {
        $pid = $_GET['pid'] ?? '';
        $range = $_GET['range'] ?? '7d';

        if (!$pid) {
            echo json_encode(['error' => 'No PID']);
            exit;
        }

        // Date Filter
        $dateFilter = "created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
        if ($range === '30d')
            $dateFilter = "created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
        if ($range === '24h')
            $dateFilter = "created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)";

        // Total Visitors
        $stmtVis = $pdo->prepare("SELECT COUNT(DISTINCT visitor_id) FROM web_visitors WHERE property_id = ? AND last_visit_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"); // Simplified
        $stmtVis->execute([$pid]);
        $totalVisitors = $stmtVis->fetchColumn();

        // Total Pageviews
        $stmtPv = $pdo->prepare("SELECT COUNT(*) FROM web_page_views WHERE property_id = ? AND $dateFilter");
        $stmtPv->execute([$pid]);
        $totalPageviews = $stmtPv->fetchColumn();

        // Avg Duration
        $stmtDur = $pdo->prepare("SELECT AVG(duration_seconds) FROM web_page_views WHERE property_id = ? AND $dateFilter");
        $stmtDur->execute([$pid]);
        $avgDuration = round($stmtDur->fetchColumn(), 1);

        // Top Pages
        $stmtTop = $pdo->prepare("SELECT url, title, COUNT(*) as views, AVG(duration_seconds) as avg_time FROM web_page_views WHERE property_id = ? AND $dateFilter GROUP BY url ORDER BY views DESC LIMIT 10");
        $stmtTop->execute([$pid]);
        $topPages = $stmtTop->fetchAll(PDO::FETCH_ASSOC);

        // Events
        $stmtEvts = $pdo->prepare("SELECT event_type, COUNT(*) as c FROM web_events WHERE property_id = ? AND $dateFilter GROUP BY event_type");
        $stmtEvts->execute([$pid]);
        $events = $stmtEvts->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'visitors' => $totalVisitors,
            'pageviews' => $totalPageviews,
            'avg_duration' => $avgDuration,
            'top_pages' => $topPages,
            'events' => $events
        ]);
    } elseif ($action === 'heatmap') {
        $pid = $_GET['pid'] ?? '';
        $url = $_GET['url'] ?? '';

        // Return raw points for client side rendering
        // In real app, we might cluster these server side
        $stmt = $pdo->prepare("SELECT x_pos, y_pos, viewport_width, viewport_height FROM web_events WHERE property_id = ? AND event_type = 'click' LIMIT 1000");
        // Note: Filter by URL needs joining page_view or storing URL in event. 
        // To fix: In track.php, we didn't store URL in web_events, only in web_page_views. 
        // We link via page_view_id.
        $stmt = $pdo->prepare("SELECT e.x_pos, e.y_pos, e.viewport_width, e.viewport_height 
                               FROM web_events e 
                               JOIN web_page_views pv ON e.page_view_id = pv.id
                               WHERE e.property_id = ? AND e.event_type = 'click' AND pv.url = ? 
                               LIMIT 2000");
        $stmt->execute([$pid, $url]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    if ($action === 'create') {
        $name = $input['name'];
        $domain = $input['domain'];
        $id = bin2hex(random_bytes(16)); // simple UUID

        $stmt = $pdo->prepare("INSERT INTO web_properties (id, name, domain) VALUES (?, ?, ?)");
        $stmt->execute([$id, $name, $domain]);

        echo json_encode(['status' => 'success', 'id' => $id]);
    } elseif ($action === 'delete') {
        $id = $input['id'];
        $pdo->prepare("DELETE FROM web_properties WHERE id = ?")->execute([$id]);
        echo json_encode(['status' => 'success']);
    }
}
?>