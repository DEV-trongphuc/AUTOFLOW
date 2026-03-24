<?php
require_once 'db_connect.php';
apiHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$startDate = $_GET['startDate'] ?? date('Y-m-01'); // Mặc định đầu tháng
$endDate = $_GET['endDate'] ?? date('Y-m-d');     // Mặc định hôm nay

if ($method !== 'GET') {
    jsonResponse(false, null, 'Method not allowed');
}

if (empty($current_admin_id)) {
    jsonResponse(false, null, 'Unauthorized');
}

try {
    $startDateFull = $startDate . " 00:00:00";
    $endDateFull = $endDate . " 23:59:59";
    $campaignId = $_GET['campaignId'] ?? null;

    if ($campaignId) {
        $sqlAB = "SELECT 
            variation,
            SUM(CASE WHEN type IN ('sent_email', 'receive_email', 'sent_zns', 'zns_sent', 'zalo_sent') THEN 1 ELSE 0 END) as sent,
            COUNT(DISTINCT CASE WHEN type = 'open_email' THEN subscriber_id END) as opened,
            COUNT(DISTINCT CASE WHEN type IN ('click_link', 'zalo_clicked', 'zns_clicked', 'click_zns') THEN subscriber_id END) as clicked,
            SUM(CASE WHEN type IN ('sent_zns', 'zns_sent', 'zalo_sent') THEN 1 ELSE 0 END) as zalo_sent,
            COUNT(DISTINCT CASE WHEN type IN ('zalo_clicked', 'zns_clicked', 'click_zns') THEN subscriber_id END) as zalo_clicked
        FROM subscriber_activity 
        WHERE campaign_id = ?
        GROUP BY variation";
        $stmtAB = $pdo->prepare($sqlAB);
        $stmtAB->execute([$campaignId]);
        $abBreakdown = $stmtAB->fetchAll(PDO::FETCH_ASSOC);

        foreach ($abBreakdown as &$row) {
            foreach ($row as $k => $v) {
                if ($k !== 'variation')
                    $row[$k] = (int) $v;
            }
        }

        jsonResponse(true, ['campaignId' => $campaignId, 'breakdown' => $abBreakdown]);
        exit;
    }

    // --- CACHE LAYER (File Based) ---
    $cacheKey = md5("report_v2_" . $startDateFull . "_" . $endDateFull); // Updated key for v2 structure
    $cacheFile = __DIR__ . '/../cache/' . $cacheKey . '.json';
    $cacheTTL = 3600; // 1 hour

    // Ensure cache dir exists
    if (!file_exists(__DIR__ . '/../cache')) {
        @mkdir(__DIR__ . '/../cache', 0777, true);
    }

    // Serve from cache if fresh
    if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTTL)) {
        $cachedData = json_decode(file_get_contents($cacheFile), true);
        if ($cachedData) {
            $cachedData['cached'] = true; // Debug flag
            jsonResponse(true, $cachedData);
            exit;
        }
    }

    // ... Original Data Fetching ...

    // 1. Tổng hợp số liệu Metrics (Optimized with index-friendly ranges)
    $sqlMetrics = "SELECT 
        SUM(CASE WHEN type IN ('sent_email', 'receive_email') THEN 1 ELSE 0 END) as sent,
        COUNT(DISTINCT CASE WHEN type = 'open_email' THEN subscriber_id END) as opened,
        COUNT(DISTINCT CASE WHEN type = 'click_link' THEN subscriber_id END) as clicked,
        COUNT(DISTINCT CASE WHEN type = 'unsubscribe' THEN subscriber_id END) as unsubscribed,
        -- Zalo Metrics (Standardized)
        SUM(CASE WHEN type IN ('sent_zns', 'zns_sent', 'zalo_sent') THEN 1 ELSE 0 END) as zalo_sent,
        SUM(CASE WHEN type = 'zns_delivered' THEN 1 ELSE 0 END) as zalo_delivered,
        COUNT(DISTINCT CASE WHEN type IN ('zalo_clicked', 'zns_clicked', 'click_zns') THEN subscriber_id END) as zalo_clicked
    FROM subscriber_activity 
    WHERE created_at >= ? AND created_at <= ?";

    $stmtMetrics = $pdo->prepare($sqlMetrics);
    $stmtMetrics->execute([$startDateFull, $endDateFull]);
    $metrics = $stmtMetrics->fetch(PDO::FETCH_ASSOC);

    foreach ($metrics as $key => $val) {
        $metrics[$key] = (int) $val;
    }

    // 2. Xu hướng hàng ngày (Daily Trend) - Optimized: Avoid DATE(created_at) in WHERE if possible
    // (Still need DATE() in SELECT for grouping, but created_at range in WHERE ensures index usage)
    $sqlTrend = "SELECT 
        DATE(created_at) as date,
        SUM(CASE WHEN type IN ('sent_email', 'receive_email') THEN 1 ELSE 0 END) as sent,
        COUNT(DISTINCT CASE WHEN type = 'open_email' THEN subscriber_id END) as opened,
        COUNT(DISTINCT CASE WHEN type = 'click_link' THEN subscriber_id END) as clicked,
        SUM(CASE WHEN type IN ('sent_zns', 'zns_sent', 'zalo_sent') THEN 1 ELSE 0 END) as zalo_sent,
        SUM(CASE WHEN type = 'zns_delivered' THEN 1 ELSE 0 END) as zalo_delivered,
        COUNT(DISTINCT CASE WHEN type IN ('zalo_clicked', 'zns_clicked', 'click_zns') THEN subscriber_id END) as zalo_clicked
    FROM subscriber_activity 
    WHERE created_at >= ? AND created_at <= ?
    GROUP BY DATE(created_at)
    ORDER BY date ASC";

    $stmtTrend = $pdo->prepare($sqlTrend);
    $stmtTrend->execute([$startDateFull, $endDateFull]);
    $trend = $stmtTrend->fetchAll(PDO::FETCH_ASSOC);

    // 3. Detailed Campaigns (Removed LIMIT 5 for full table/CSV)
    $sqlTopCampaigns = "SELECT id, name, count_sent as sent, count_unique_opened as opened, count_unique_clicked as clicked, count_bounced as bounced, count_spam as spam, created_at, status
                        FROM campaigns 
                        WHERE status != 'draft' AND ((sent_at >= ? AND sent_at <= ?) OR (created_at >= ? AND created_at <= ?))
                        ORDER BY count_unique_opened DESC";
    $stmtTopCampaigns = $pdo->prepare($sqlTopCampaigns);
    $stmtTopCampaigns->execute([$startDateFull, $endDateFull, $startDateFull, $endDateFull]);
    $topCampaigns = $stmtTopCampaigns->fetchAll(PDO::FETCH_ASSOC);

    // 4. Detailed Flows
    $sqlTopFlows = "SELECT id, name, stat_total_sent as sent, stat_unique_opened as opened, stat_unique_clicked as clicked, stat_total_failed as failed, created_at, status
                    FROM flows 
                    ORDER BY stat_unique_opened DESC";
    $stmtTopFlows = $pdo->prepare($sqlTopFlows);
    $stmtTopFlows->execute([]);
    $topFlows = $stmtTopFlows->fetchAll(PDO::FETCH_ASSOC);

    $responsePayload = [
        'metrics' => $metrics,
        'trend' => $trend,
        'topCampaigns' => $topCampaigns,
        'topFlows' => $topFlows,
        'range' => ['start' => $startDate, 'end' => $endDate]
    ];

    // Save to cache
    file_put_contents($cacheFile, json_encode($responsePayload));

    jsonResponse(true, $responsePayload);

} catch (Exception $e) {
    jsonResponse(false, null, $e->getMessage());
}
