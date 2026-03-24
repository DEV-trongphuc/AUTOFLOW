<?php
header('Content-Type: text/plain');
require_once 'db_connect.php';

$id = $_GET['id'] ?? '';
if (!$id)
    die("Missing id");

global $pdo;

echo "--- TOP 20 SESSIONS WITH HIGHEST DURATION (In Last 30 Days) ---\n";
echo "Format: [Duration] [Device/OS/Browser] [IP - City] [Visitor ID]\n\n";

$sql = "
    SELECT 
        s.id,
        s.duration_seconds,
        s.started_at,
        s.device_type,
        s.os,
        s.browser,
        v.ip_address,
        v.city,
        v.country,
        v.id as visitor_id,
        (SELECT COUNT(*) FROM web_page_views WHERE session_id = s.id) as page_count
    FROM web_sessions s
    JOIN web_visitors v ON s.visitor_id = v.id
    WHERE s.property_id = ? 
    AND s.device_type != 'bot'
    AND s.started_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    ORDER BY s.duration_seconds DESC
    LIMIT 20
";

$stmt = $pdo->prepare($sql);
$stmt->execute([$id]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($rows as $row) {
    $duration = gmdate("H:i:s", (int) $row['duration_seconds']);
    echo "[$duration] {$row['device_type']} / {$row['os']} / {$row['browser']} | {$row['ip_address']} ({$row['city']}, {$row['country']}) | Pages: {$row['page_count']}\n";
    echo "   -> Visitor ID: {$row['visitor_id']}\n";

    // Get visited URLs
    $stmtUrls = $pdo->prepare("SELECT url, title FROM web_page_views WHERE session_id = ? LIMIT 3");
    $stmtUrls->execute([$row['id']]);
    $urls = $stmtUrls->fetchAll(PDO::FETCH_ASSOC);
    foreach ($urls as $u) {
        echo "      - {$u['title']} ({$u['url']})\n";
    }
    echo "\n";
}

echo "\n--- IMPACT ANALYSIS ---\n";
// Calculate Avg Duration WITH and WITHOUT Top 50 outliers
$sqlAvg = "SELECT AVG(duration_seconds) FROM web_sessions WHERE property_id = ? AND device_type != 'bot' AND started_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
$rawAvg = $pdo->prepare($sqlAvg);
$rawAvg->execute([$id]);
$avg1 = $rawAvg->fetchColumn();

// Avg trimming top 5%
$sqlTrimmed = "
    SELECT AVG(duration_seconds) 
    FROM (
        SELECT duration_seconds 
        FROM web_sessions 
        WHERE property_id = ? AND device_type != 'bot' AND started_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ORDER BY duration_seconds ASC
        LIMIT 950 -- Just an estimation, proper percentile needs more complex query
    ) as sub
";
// Better: just Median estimate or excluding huge ones
$sqlExcl = "SELECT AVG(duration_seconds) FROM web_sessions WHERE property_id = ? AND device_type != 'bot' AND started_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND duration_seconds < 1800";
$exclAvg = $pdo->prepare($sqlExcl);
$exclAvg->execute([$id]);
$avg2 = $exclAvg->fetchColumn();

echo "Current Avg: " . gmdate("i:s", (int) $avg1) . "\n";
echo "Avg without > 30min sessions: " . gmdate("i:s", (int) $avg2) . "\n";
