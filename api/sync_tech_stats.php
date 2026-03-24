<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

$cid = '6985cffc6c490';
echo "SYNCING DEVICE & TECH STATS FOR $cid\n";
echo "====================================\n\n";

try {
    // 1. Calculate mobile vs desktop from Activity Logs (Opens & Clicks combined)
    $stmt = $pdo->prepare("SELECT 
        SUM(CASE WHEN device_type = 'mobile' THEN 1 ELSE 0 END) as mobile,
        SUM(CASE WHEN device_type = 'desktop' THEN 1 ELSE 0 END) as desktop
        FROM subscriber_activity 
        WHERE campaign_id = ? AND type IN ('open_email', 'click_link')");
    $stmt->execute([$cid]);
    $res = $stmt->fetch();

    echo "Calculated Stats:\n";
    echo " - Mobile: {$res['mobile']}\n";
    echo " - Desktop: {$res['desktop']}\n";

    // 2. Update Campaign Table
    $pdo->prepare("UPDATE campaigns SET stat_device_mobile = ?, stat_device_desktop = ? WHERE id = ?")
        ->execute([$res['mobile'], $res['desktop'], $cid]);

    echo "\nCampaign table updated successfully.\n";

    // 3. Optional: Sync Location Top 10 into JSON stats if that's where UI looks
    // (Assuming UI uses tech_stats route mainly now)

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
