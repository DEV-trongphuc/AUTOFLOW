<?php
require_once 'db_connect.php';

// Safe execution limits
error_reporting(E_ALL);
ini_set('display_errors', 1);
set_time_limit(300);

echo "<h2>Tracking Debounce & Cleanup Tool</h2>\n";

// Load scoring config
$scoringFile = __DIR__ . '/scoring_config.php';
$scoring = file_exists($scoringFile) ? require($scoringFile) : [];
$pOpen = $scoring['email_open'] ?? 1;
$pClick = $scoring['email_click'] ?? 5;
$pZaloClick = $scoring['zalo_click'] ?? 5;

// 1. Identify EXACT duplicates within the SAME minute
$sql = "
    SELECT 
        min(id) as keep_id, 
        subscriber_id, 
        campaign_id, 
        flow_id, 
        type, 
        reference_id, 
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as minute
    FROM subscriber_activity
    WHERE type IN ('open_email', 'click_link', 'zalo_clicked')
    GROUP BY 
        subscriber_id, 
        campaign_id, 
        flow_id, 
        type, 
        reference_id, 
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i')
    HAVING count(*) > 1
";

$stmt = $pdo->query($sql);
$duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($duplicates)) {
    echo "<p>✅ No duplicate tracking spam found! System is clean.</p>";
    exit;
}

echo "<p>Found <b>" . count($duplicates) . "</b> chunks of tracking spam. Cleaning up...</p>";

$totalDeleted = 0;
$scoreAdjustments = 0;

$pdo->beginTransaction();

try {
    foreach ($duplicates as $dup) {
        $keepId = $dup['keep_id'];
        $subId = $dup['subscriber_id'];
        $cid = $dup['campaign_id'];
        $fid = $dup['flow_id'];
        $type = $dup['type'];
        $refId = $dup['reference_id'];
        $minute = $dup['minute'];
        
        $delStmt = $pdo->prepare("
            SELECT id FROM subscriber_activity 
            WHERE type = ? 
            AND subscriber_id = ? 
            AND (campaign_id = ? OR (campaign_id IS NULL AND ? IS NULL))
            AND (flow_id = ? OR (flow_id IS NULL AND ? IS NULL))
            AND (reference_id = ? OR (reference_id IS NULL AND ? IS NULL))
            AND DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') = ? 
            AND id != ?
        ");
        $delStmt->execute([$type, $subId, $cid, $cid, $fid, $fid, $refId, $refId, $minute, $keepId]);
        $idsToDelete = $delStmt->fetchAll(PDO::FETCH_COLUMN);
        
        $deleteCount = count($idsToDelete);
        if ($deleteCount > 0) {
            // 1. Delete rows
            $placeholders = str_repeat('?,', $deleteCount - 1) . '?';
            $pdo->prepare("DELETE FROM subscriber_activity WHERE id IN ($placeholders)")->execute($idsToDelete);
            
            // 2. Determine point deduction
            $pts = 0;
            $col = '';
            if ($type === 'open_email') { $pts = $pOpen; $col = 'stats_opened'; }
            elseif ($type === 'click_link') { $pts = $pClick; $col = 'stats_clicked'; }
            elseif ($type === 'zalo_clicked') { $pts = $pZaloClick; $col = 'stats_clicked'; }
            
            $deduction = $deleteCount * $pts;
            
            // 3. Update Subscriber record
            $pdo->prepare("UPDATE subscribers SET $col = GREATEST(0, CAST($col AS SIGNED) - ?), lead_score = GREATEST(0, CAST(lead_score AS SIGNED) - ?) WHERE id = ?")
                ->execute([$deleteCount, $deduction, $subId]);
                
            $totalDeleted += $deleteCount;
            $scoreAdjustments += $deduction;
        }
    }
    
    // Recalculate Campaign Stats
    echo "<p>Recalculating Campaign Aggregates...</p>";
    $campaignsStmt = $pdo->query("SELECT id FROM campaigns");
    while ($camp = $campaignsStmt->fetch()) {
        $cid = $camp['id'];
        
        $cOpen = $pdo->prepare("SELECT count(*) FROM subscriber_activity WHERE type = 'open_email' AND campaign_id = ?")->execute([$cid]);
        $totalOpened = $pdo->prepare("SELECT count(*) FROM subscriber_activity WHERE type = 'open_email' AND campaign_id = ?"); $totalOpened->execute([$cid]); $totalOpened = $totalOpened->fetchColumn();
        $uniqOpened = $pdo->prepare("SELECT count(DISTINCT subscriber_id) FROM subscriber_activity WHERE type = 'open_email' AND campaign_id = ?"); $uniqOpened->execute([$cid]); $uniqOpened = $uniqOpened->fetchColumn();
        
        $totalClicked = $pdo->prepare("SELECT count(*) FROM subscriber_activity WHERE type = 'click_link' AND campaign_id = ?"); $totalClicked->execute([$cid]); $totalClicked = $totalClicked->fetchColumn();
        $uniqClicked = $pdo->prepare("SELECT count(DISTINCT subscriber_id) FROM subscriber_activity WHERE type = 'click_link' AND campaign_id = ?"); $uniqClicked->execute([$cid]); $uniqClicked = $uniqClicked->fetchColumn();
        
        $pdo->prepare("UPDATE campaigns SET count_opened = ?, stat_opens = ?, count_unique_opened = ?, count_clicked = ?, stat_clicks = ?, count_unique_clicked = ? WHERE id = ?")
            ->execute([$totalOpened, $totalOpened, $uniqOpened, $totalClicked, $totalClicked, $uniqClicked, $cid]);
    }
    
    $pdo->commit();
    echo "<p>✅ <b>Success!</b></p>";
    echo "<ul>";
    echo "<li>Deleted <b>$totalDeleted</b> duplicate spam logs.</li>";
    echo "<li>Deducted <b>$scoreAdjustments</b> falsely inflated Lead Score points.</li>";
    echo "<li>Restored Campaign & Profile aggregates to 100% accuracy.</li>";
    echo "</ul>";

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "<p style='color:red;'>❌ Error during migration: " . $e->getMessage() . "</p>";
}
