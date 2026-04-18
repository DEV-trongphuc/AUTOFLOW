<?php
require_once __DIR__ . '/api/db_connect.php';
$cid = '69de8aa4e74b4';
$stmt = $pdo->prepare("SELECT * FROM campaigns WHERE id = ?");
$stmt->execute([$cid]);
$campaign = $stmt->fetch(PDO::FETCH_ASSOC);

echo "CAMPAIGN DATA:\n";
print_r($campaign);

$stmtAct = $pdo->prepare("SELECT type, COUNT(*) as count FROM subscriber_activity WHERE campaign_id = ? GROUP BY type");
$stmtAct->execute([$cid]);
echo "\nACTIVITY SUMMARY:\n";
print_r($stmtAct->fetchAll(PDO::FETCH_ASSOC));

$stmtProcessing = $pdo->prepare("SELECT * FROM subscriber_activity WHERE campaign_id = ? AND type = 'processing_campaign'");
$stmtProcessing->execute([$cid]);
echo "\nCURRENTLY LOCKED (processing_campaign):\n";
print_r($stmtProcessing->fetchAll(PDO::FETCH_ASSOC));

// Check if any subscribers are eligible
$targetConf = json_decode($campaign['target_config'], true);
echo "\nTARGET CONFIG:\n";
print_r($targetConf);
?>
