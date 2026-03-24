<?php
// api/worker_campaign_dryrun.php - DRY-RUN MODE (Performance Testing Without Sending)
// This simulates the entire campaign sending process but skips actual SMTP/API calls.

error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);
ini_set('display_errors', 1);
set_time_limit(600);
ignore_user_abort(true);

require_once 'db_connect.php';
require_once 'segment_helper.php';
require_once 'flow_helpers.php';

date_default_timezone_set('Asia/Ho_Chi_Minh');
$pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
header('Content-Type: text/html; charset=utf-8');

$apiUrl = API_BASE_URL;
$stmt = $pdo->query("SELECT * FROM system_settings");
$settings = [];
foreach ($stmt->fetchAll() as $row) {
    $settings[$row['key']] = $row['value'];
}

echo "<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Campaign Dry-Run Benchmark</title>
    <style>
        body { font-family: 'JetBrains Mono', monospace; background: #0f172a; color: #94a3b8; padding: 20px; }
        .header { background: #1e293b; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6; }
        h1 { color: #f1f5f9; margin: 0 0 10px 0; }
        .info { color: #60a5fa; font-size: 14px; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
        .stat-card { background: #1e293b; padding: 15px; border-radius: 6px; border: 1px solid #334155; }
        .stat-label { color: #64748b; font-size: 12px; text-transform: uppercase; }
        .stat-value { color: #f1f5f9; font-size: 24px; font-weight: bold; margin-top: 5px; }
        .log { background: #1e293b; padding: 15px; border-radius: 6px; border: 1px solid #334155; max-height: 500px; overflow-y: auto; }
        .log-line { padding: 4px 0; border-bottom: 1px solid #334155; }
        .success { color: #4ade80; }
        .warning { color: #fbbf24; }
        .error { color: #f87171; }
        .progress { background: #334155; height: 20px; border-radius: 10px; overflow: hidden; margin: 10px 0; }
        .progress-bar { background: linear-gradient(90deg, #3b82f6, #8b5cf6); height: 100%; transition: width 0.3s; }
    </style>
</head>
<body>
<div class='header'>
    <h1>🧪 Campaign Dry-Run Benchmark</h1>
    <div class='info'>Performance testing mode - No actual emails will be sent</div>
</div>";

$campaignId = $_GET['campaign_id'] ?? null;
if (!$campaignId) {
    echo "<div class='error'>❌ Error: Please provide campaign_id parameter</div>";
    echo "<div class='info'>Example: ?campaign_id=123</div>";
    exit;
}

$stmtCamp = $pdo->prepare("SELECT * FROM campaigns WHERE id = ? LIMIT 1");
$stmtCamp->execute([$campaignId]);
$campaign = $stmtCamp->fetch();

if (!$campaign) {
    echo "<div class='error'>❌ Campaign not found</div>";
    exit;
}

echo "<div class='info'>📧 Campaign: <b>{$campaign['name']}</b> (ID: {$campaignId})</div>";

// Start benchmark
$startTime = microtime(true);
$logs = [];
$totalProcessed = 0;
$totalBatches = 0;
$batchTimes = [];

// Build query (same as real worker)
$wheres = [];
$queryBaseParams = [];
$target = json_decode($campaign['target_config'], true);

if (!empty($target['listIds'])) {
    $ids = implode("','", $target['listIds']);
    $wheres[] = "s.id IN (SELECT subscriber_id FROM subscriber_lists WHERE list_id IN ('$ids'))";
}
if (!empty($target['tagIds'])) {
    $tagConditions = [];
    foreach ($target['tagIds'] as $tag) {
        $tagConditions[] = "s.id IN (SELECT st.subscriber_id FROM subscriber_tags st JOIN tags t_sub ON st.tag_id = t_sub.id WHERE t_sub.name = ?)";
        $queryBaseParams[] = $tag;
    }
    if (!empty($tagConditions))
        $wheres[] = "(" . implode(' OR ', $tagConditions) . ")";
}
if (!empty($target['segmentIds'])) {
    $segIds = implode("','", $target['segmentIds']);
    $stmtSegs = $pdo->query("SELECT criteria FROM segments WHERE id IN ('$segIds')");
    foreach ($stmtSegs->fetchAll() as $seg) {
        $res = buildSegmentWhereClause($seg['criteria']);
        if ($res['sql'] !== '1=1') {
            $wheres[] = $res['sql'];
            foreach ($res['params'] as $p)
                $queryBaseParams[] = $p;
        }
    }
}

$BATCH_SIZE = 500;
$hasMore = true;

echo "<div class='progress'><div class='progress-bar' id='progressBar' style='width: 0%'></div></div>";
echo "<div class='stats' id='statsContainer'>
    <div class='stat-card'><div class='stat-label'>Processed</div><div class='stat-value' id='processed'>0</div></div>
    <div class='stat-card'><div class='stat-label'>Batches</div><div class='stat-value' id='batches'>0</div></div>
    <div class='stat-card'><div class='stat-label'>Speed (emails/s)</div><div class='stat-value' id='speed'>0</div></div>
    <div class='stat-card'><div class='stat-label'>Elapsed Time</div><div class='stat-value' id='elapsed'>0s</div></div>
</div>";

echo "<div class='log' id='logContainer'>";

// First, count total
$countSql = "SELECT COUNT(DISTINCT s.id) FROM subscribers s WHERE s.status IN ('active', 'lead', 'customer')";
if (!empty($wheres))
    $countSql .= " AND (" . implode(' OR ', $wheres) . ")";
$stmtCount = $pdo->prepare($countSql);
$stmtCount->execute($queryBaseParams);
$totalAudience = (int) $stmtCount->fetchColumn();

echo "<div class='log-line success'>✅ Total audience: <b>$totalAudience</b> subscribers</div>";
flush();
ob_flush();

while ($hasMore) {
    $batchStart = microtime(true);

    $sql = "SELECT s.id, s.email, s.first_name, s.last_name, s.phone_number, s.custom_attributes 
            FROM subscribers s 
            WHERE s.status IN ('active', 'lead', 'customer')";
    $execParams = $queryBaseParams;

    if (!empty($wheres))
        $sql .= " AND (" . implode(' OR ', $wheres) . ")";

    // Exclude already "sent" (in dry-run, we'll use a session marker)
    $sql .= " AND s.id > ?";
    $execParams[] = $totalProcessed > 0 ? ($totalProcessed) : 0;

    $sql .= " LIMIT $BATCH_SIZE";

    $stmtSubs = $pdo->prepare($sql);
    $stmtSubs->execute($execParams);
    $recipients = $stmtSubs->fetchAll();

    if (empty($recipients)) {
        $hasMore = false;
        break;
    }

    $batchCount = count($recipients);
    $totalBatches++;

    // Simulate processing
    foreach ($recipients as $sub) {
        $totalProcessed++;

        // Simulate merge tags replacement (CPU work)
        $content = "Hello {$sub['first_name']} {$sub['last_name']}";
        $content = str_replace(['{first_name}', '{last_name}'], [$sub['first_name'], $sub['last_name']], $content);

        // Simulate tracking URL injection
        $trackingUrl = $apiUrl . "/webhook.php?type=open&sid={$sub['id']}&cid={$campaignId}";

        // NO ACTUAL SMTP CALL - This is the key difference
        usleep(500); // Simulate 0.5ms processing time per email
    }

    $batchEnd = microtime(true);
    $batchTime = $batchEnd - $batchStart;
    $batchTimes[] = $batchTime;

    $elapsed = microtime(true) - $startTime;
    $speed = $totalProcessed / $elapsed;
    $progress = ($totalProcessed / $totalAudience) * 100;

    echo "<div class='log-line'>📦 Batch #{$totalBatches}: Processed <b>$batchCount</b> subscribers in <b>" . number_format($batchTime, 2) . "s</b> | Speed: <b>" . number_format($speed, 1) . " emails/s</b></div>";

    // Update stats via JavaScript
    echo "<script>
        document.getElementById('processed').textContent = '$totalProcessed';
        document.getElementById('batches').textContent = '$totalBatches';
        document.getElementById('speed').textContent = '" . number_format($speed, 1) . "';
        document.getElementById('elapsed').textContent = '" . number_format($elapsed, 1) . "s';
        document.getElementById('progressBar').style.width = '" . number_format($progress, 1) . "%';
    </script>";

    flush();
    ob_flush();

    if ($totalProcessed >= $totalAudience) {
        $hasMore = false;
    }
}

$endTime = microtime(true);
$totalTime = $endTime - $startTime;
$avgSpeed = $totalProcessed / $totalTime;
$avgBatchTime = array_sum($batchTimes) / count($batchTimes);

echo "</div>";

echo "<div class='header' style='margin-top: 20px; border-left-color: #4ade80;'>
    <h1>✅ Dry-Run Complete</h1>
    <div style='margin-top: 15px; line-height: 1.8;'>
        <div>📊 <b>Total Processed:</b> $totalProcessed emails</div>
        <div>⏱️ <b>Total Time:</b> " . number_format($totalTime, 2) . " seconds</div>
        <div>🚀 <b>Average Speed:</b> " . number_format($avgSpeed, 1) . " emails/second</div>
        <div>📦 <b>Total Batches:</b> $totalBatches</div>
        <div>⚡ <b>Avg Batch Time:</b> " . number_format($avgBatchTime, 2) . " seconds</div>
    </div>
</div>";

echo "<div class='header' style='margin-top: 20px; border-left-color: #fbbf24;'>
    <h1>📝 Estimated Real-World Performance</h1>
    <div style='margin-top: 15px; line-height: 1.8;'>
        <div class='warning'>⚠️ Note: This dry-run does NOT include SMTP overhead</div>
        <div style='margin-top: 10px;'>
            <b>With SMTP (Amazon SES ~14 emails/s):</b><br>
            • Estimated time for $totalProcessed emails: <b>" . number_format($totalProcessed / 14, 1) . " seconds</b> (" . number_format($totalProcessed / 14 / 60, 1) . " minutes)
        </div>
        <div style='margin-top: 10px;'>
            <b>With 3 parallel workers:</b><br>
            • Estimated time: <b>" . number_format($totalProcessed / 14 / 3, 1) . " seconds</b> (" . number_format($totalProcessed / 14 / 3 / 60, 1) . " minutes)
        </div>
    </div>
</div>";

echo "</body></html>";
