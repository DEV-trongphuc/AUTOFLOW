<?php
// api/web_analytics_report.php - Get web analytics reports
header('Content-Type: application/json');
require_once 'db_connect.php';

try {
    $pdo = getDbConnection();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $route = $_GET['route'] ?? 'overview';

        switch ($route) {
            case 'overview':
                echo json_encode(getOverview($pdo, $_GET));
                break;
            case 'pages':
                echo json_encode(getTopPages($pdo, $_GET));
                break;
            case 'events':
                echo json_encode(getEvents($pdo, $_GET));
                break;
            case 'heatmap':
                echo json_encode(getHeatmapData($pdo, $_GET));
                break;
            case 'realtime':
                echo json_encode(getRealtimeData($pdo));
                break;
            case 'visitors':
                echo json_encode(getVisitors($pdo, $_GET));
                break;
            case 'growth':
                echo json_encode(getGrowthData($pdo, $_GET));
                break;
            default:
                throw new Exception('Unknown route');
        }
    } else {
        throw new Exception('Method not allowed');
    }

} catch (Exception $e) {
    http_response_code(400);
    error_log('[EXCEPTION] ' . $e->getMessage() . ' in ' . __FILE__ . ':' . __LINE__);
    echo json_encode(['success' => false, 'message' => 'Lỗi hệ thống, vui lòng thử lại.']);
}

// ============= Report Functions =============

function getOverview($pdo, $params)
{
    $dateFrom = $params['date_from'] ?? date('Y-m-d', strtotime('-30 days'));
    $dateTo = $params['date_to'] ?? date('Y-m-d');

    // Total stats
    $stmt = $pdo->prepare("
        SELECT 
            COUNT(DISTINCT session_id) as total_sessions,
            COUNT(DISTINCT visitor_id) as total_visitors,
            COUNT(DISTINCT subscriber_id) as identified_users,
            COUNT(*) as total_pageviews,
            AVG(duration) as avg_duration,
            AVG(scroll_depth) as avg_scroll_depth
        FROM web_page_views
        WHERE DATE(viewed_at) BETWEEN ? AND ?
    ");
    $stmt->execute([$dateFrom, $dateTo]);
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);

    // Bounce rate (sessions with only 1 page view)
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as bounced_sessions
        FROM web_sessions
        WHERE DATE(session_start) BETWEEN ? AND ?
        AND page_views = 1
    ");
    $stmt->execute([$dateFrom, $dateTo]);
    $bounced = $stmt->fetch(PDO::FETCH_ASSOC);

    $totalSessions = (int) $stats['total_sessions'];
    $bounceRate = $totalSessions > 0 ? round(($bounced['bounced_sessions'] / $totalSessions) * 100, 2) : 0;

    // Daily trend
    $stmt = $pdo->prepare("
        SELECT 
            DATE(viewed_at) as date,
            COUNT(DISTINCT session_id) as sessions,
            COUNT(DISTINCT visitor_id) as visitors,
            COUNT(*) as pageviews
        FROM web_page_views
        WHERE DATE(viewed_at) BETWEEN ? AND ?
        GROUP BY DATE(viewed_at)
        ORDER BY date ASC
    ");
    $stmt->execute([$dateFrom, $dateTo]);
    $dailyTrend = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Device breakdown
    $stmt = $pdo->prepare("
        SELECT 
            device_type,
            COUNT(*) as count,
            ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
        FROM web_sessions
        WHERE DATE(session_start) BETWEEN ? AND ?
        GROUP BY device_type
    ");
    $stmt->execute([$dateFrom, $dateTo]);
    $deviceBreakdown = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Top sources
    $stmt = $pdo->prepare("
        SELECT 
            COALESCE(utm_source, 'Direct') as source,
            COUNT(*) as sessions,
            COUNT(DISTINCT visitor_id) as visitors
        FROM web_sessions
        WHERE DATE(session_start) BETWEEN ? AND ?
        GROUP BY utm_source
        ORDER BY sessions DESC
        LIMIT 10
    ");
    $stmt->execute([$dateFrom, $dateTo]);
    $topSources = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return [
        'success' => true,
        'stats' => [
            'total_sessions' => (int) $stats['total_sessions'],
            'total_visitors' => (int) $stats['total_visitors'],
            'identified_users' => (int) $stats['identified_users'],
            'total_pageviews' => (int) $stats['total_pageviews'],
            'avg_duration' => round((float) $stats['avg_duration'], 1),
            'avg_scroll_depth' => round((float) $stats['avg_scroll_depth'], 1),
            'bounce_rate' => $bounceRate
        ],
        'daily_trend' => $dailyTrend,
        'device_breakdown' => $deviceBreakdown,
        'top_sources' => $topSources
    ];
}

function getTopPages($pdo, $params)
{
    $dateFrom = $params['date_from'] ?? date('Y-m-d', strtotime('-30 days'));
    $dateTo = $params['date_to'] ?? date('Y-m-d');
    $limit = (int) ($params['limit'] ?? 20);

    $stmt = $pdo->prepare("
        SELECT 
            page_url,
            page_title,
            COUNT(*) as views,
            COUNT(DISTINCT visitor_id) as unique_visitors,
            AVG(duration) as avg_duration,
            AVG(scroll_depth) as avg_scroll_depth,
            SUM(CASE WHEN duration < 5 THEN 1 ELSE 0 END) as quick_exits,
            ROUND(SUM(CASE WHEN duration < 5 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as bounce_rate
        FROM web_page_views
        WHERE DATE(viewed_at) BETWEEN ? AND ?
        GROUP BY page_url, page_title
        ORDER BY views DESC
        LIMIT ?
    ");
    $stmt->execute([$dateFrom, $dateTo, $limit]);
    $pages = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format results
    foreach ($pages as &$page) {
        $page['views'] = (int) $page['views'];
        $page['unique_visitors'] = (int) $page['unique_visitors'];
        $page['avg_duration'] = round((float) $page['avg_duration'], 1);
        $page['avg_scroll_depth'] = round((float) $page['avg_scroll_depth'], 1);
        $page['quick_exits'] = (int) $page['quick_exits'];
    }

    return [
        'success' => true,
        'pages' => $pages
    ];
}

function getEvents($pdo, $params)
{
    $dateFrom = $params['date_from'] ?? date('Y-m-d', strtotime('-30 days'));
    $dateTo = $params['date_to'] ?? date('Y-m-d');
    $eventType = $params['event_type'] ?? null;
    $pageUrl = $params['page_url'] ?? null;
    $limit = (int) ($params['limit'] ?? 100);

    $sql = "
        SELECT 
            event_type,
            event_name,
            page_url,
            element_text,
            target_url,
            COUNT(*) as count,
            COUNT(DISTINCT visitor_id) as unique_users
        FROM web_events
        WHERE DATE(occurred_at) BETWEEN ? AND ?
    ";

    $bindings = [$dateFrom, $dateTo];

    if ($eventType) {
        $sql .= " AND event_type = ?";
        $bindings[] = $eventType;
    }

    if ($pageUrl) {
        $sql .= " AND page_url = ?";
        $bindings[] = $pageUrl;
    }

    $sql .= " GROUP BY event_type, event_name, page_url, element_text, target_url
              ORDER BY count DESC
              LIMIT ?";

    $bindings[] = $limit;

    $stmt = $pdo->prepare($sql);
    $stmt->execute($bindings);
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format results
    foreach ($events as &$event) {
        $event['count'] = (int) $event['count'];
        $event['unique_users'] = (int) $event['unique_users'];
    }

    return [
        'success' => true,
        'events' => $events
    ];
}

function getHeatmapData($pdo, $params)
{
    $pageUrl = $params['page_url'] ?? null;
    $dateFrom = $params['date_from'] ?? date('Y-m-d', strtotime('-7 days'));
    $dateTo = $params['date_to'] ?? date('Y-m-d');

    if (!$pageUrl) {
        throw new Exception('page_url parameter is required');
    }

    $stmt = $pdo->prepare("
        SELECT 
            x_position,
            y_position,
            viewport_width,
            viewport_height,
            element_text,
            COUNT(*) as click_count
        FROM web_heatmap_data
        WHERE page_url = ?
        AND DATE(clicked_at) BETWEEN ? AND ?
        GROUP BY x_position, y_position, viewport_width, viewport_height, element_text
        ORDER BY click_count DESC
    ");
    $stmt->execute([$pageUrl, $dateFrom, $dateTo]);
    $heatmapData = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format results
    foreach ($heatmapData as &$point) {
        $point['x_position'] = (int) $point['x_position'];
        $point['y_position'] = (int) $point['y_position'];
        $point['viewport_width'] = (int) $point['viewport_width'];
        $point['viewport_height'] = (int) $point['viewport_height'];
        $point['click_count'] = (int) $point['click_count'];
    }

    return [
        'success' => true,
        'heatmap_data' => $heatmapData,
        'page_url' => $pageUrl
    ];
}

function getRealtimeData($pdo)
{
    // Active sessions in last 5 minutes
    $stmt = $pdo->query("
        SELECT 
            COUNT(DISTINCT session_id) as active_sessions,
            COUNT(DISTINCT visitor_id) as active_visitors
        FROM web_page_views
        WHERE viewed_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    ");
    $active = $stmt->fetch(PDO::FETCH_ASSOC);

    // Recent page views (last 10)
    $stmt = $pdo->query("
        SELECT 
            page_url,
            page_title,
            viewed_at,
            duration
        FROM web_page_views
        ORDER BY viewed_at DESC
        LIMIT 10
    ");
    $recentViews = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Recent events (last 10)
    $stmt = $pdo->query("
        SELECT 
            event_type,
            event_name,
            page_url,
            element_text,
            occurred_at
        FROM web_events
        ORDER BY occurred_at DESC
        LIMIT 10
    ");
    $recentEvents = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return [
        'success' => true,
        'active_sessions' => (int) $active['active_sessions'],
        'active_visitors' => (int) $active['active_visitors'],
        'recent_views' => $recentViews,
        'recent_events' => $recentEvents
    ];
}

function getVisitors($pdo, $params)
{
    $dateFrom = $params['date_from'] ?? date('Y-m-d', strtotime('-30 days'));
    $dateTo = $params['date_to'] ?? date('Y-m-d');
    $limit = (int) ($params['limit'] ?? 50);

    $stmt = $pdo->prepare("
        SELECT 
            s.visitor_id,
            s.subscriber_id,
            sub.email,
            sub.first_name,
            sub.last_name,
            COUNT(DISTINCT s.id) as session_count,
            SUM(s.page_views) as total_pageviews,
            SUM(s.total_duration) as total_duration,
            MAX(s.session_end) as last_visit,
            s.device_type,
            s.browser,
            s.os,
            s.country,
            s.city
        FROM web_sessions s
        LEFT JOIN subscribers sub ON s.subscriber_id = sub.id
        WHERE DATE(s.session_start) BETWEEN ? AND ?
        GROUP BY s.visitor_id, s.subscriber_id, sub.email, sub.first_name, sub.last_name, 
                 s.device_type, s.browser, s.os, s.country, s.city
        ORDER BY last_visit DESC
        LIMIT ?
    ");
    $stmt->execute([$dateFrom, $dateTo, $limit]);
    $visitors = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format results
    foreach ($visitors as &$visitor) {
        $visitor['session_count'] = (int) $visitor['session_count'];
        $visitor['total_pageviews'] = (int) $visitor['total_pageviews'];
        $visitor['total_duration'] = (int) $visitor['total_duration'];
        $visitor['is_identified'] = !empty($visitor['subscriber_id']);
    }

    return [
        'success' => true,
        'visitors' => $visitors
    ];
}

function getGrowthData($pdo, $params)
{
    $period = $params['period'] ?? 'daily'; // daily, weekly, monthly
    $dateFrom = $params['date_from'] ?? date('Y-m-d', strtotime('-30 days'));
    $dateTo = $params['date_to'] ?? date('Y-m-d');

    $dateFormat = match ($period) {
        'weekly' => '%Y-%u',
        'monthly' => '%Y-%m',
        default => '%Y-%m-%d'
    };

    // Growth metrics
    $stmt = $pdo->prepare("
        SELECT 
            DATE_FORMAT(viewed_at, ?) as period,
            COUNT(DISTINCT session_id) as sessions,
            COUNT(DISTINCT visitor_id) as visitors,
            COUNT(*) as pageviews,
            AVG(duration) as avg_duration,
            AVG(scroll_depth) as avg_scroll_depth
        FROM web_page_views
        WHERE DATE(viewed_at) BETWEEN ? AND ?
        GROUP BY period
        ORDER BY period ASC
    ");
    $stmt->execute([$dateFormat, $dateFrom, $dateTo]);
    $growth = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format results
    foreach ($growth as &$row) {
        $row['sessions'] = (int) $row['sessions'];
        $row['visitors'] = (int) $row['visitors'];
        $row['pageviews'] = (int) $row['pageviews'];
        $row['avg_duration'] = round((float) $row['avg_duration'], 1);
        $row['avg_scroll_depth'] = round((float) $row['avg_scroll_depth'], 1);
    }

    return [
        'success' => true,
        'period' => $period,
        'growth_data' => $growth
    ];
}
?>
