<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

echo "OPEN LINKAGE AUDIT\n";
echo "==================\n\n";

try {
    $cid = '6985cffc6c490';
    $fid_suspect = '808da9d3-dca9-475b-844f-5df52ac0508b'; // Capture Website Flow

    // Find opens in the suspect flow that might be orphans of our campaign
    $stmt = $pdo->prepare("
        SELECT COUNT(*) 
        FROM subscriber_activity sa
        JOIN mail_delivery_logs mdl ON sa.subscriber_id = mdl.subscriber_id
        WHERE sa.type = 'open_email' 
        AND sa.flow_id = ?
        AND (sa.campaign_id IS NULL OR sa.campaign_id = '')
        AND mdl.campaign_id = ?
        AND mdl.status = 'success'
        AND sa.created_at >= mdl.sent_at
    ");
    $stmt->execute([$fid_suspect, $cid]);
    $matched = $stmt->fetchColumn();

    echo "Found $matched 'open_email' records in Flow '$fid_suspect' that belong to subscribers of Campaign '$cid'.\n";
    echo "These are highly likely the missing campaign opens.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
