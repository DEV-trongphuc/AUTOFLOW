<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

$cid = '6985cffc6c490';
echo "CAMPAIGN DATA RECOVERY TOOL\n";
echo "============================\n\n";

if (!isset($_GET['commit'])) {
    echo "DRY RUN MODE. Add ?commit=1 to actually and restore data.\n\n";
}

try {
    // 1. Get Campaign Details
    $stmt = $pdo->prepare("SELECT name FROM campaigns WHERE id = ?");
    $stmt->execute([$cid]);
    $cName = $stmt->fetchColumn();

    if (!$cName) {
        die("Campaign $cid not found.\n");
    }

    // 2. Identify missing receive_email logs
    echo "Analyzing mail_delivery_logs vs subscriber_activity...\n";
    $stmt = $pdo->prepare("
        SELECT mdl.subscriber_id, mdl.recipient, mdl.sent_at 
        FROM mail_delivery_logs mdl
        LEFT JOIN subscriber_activity sa ON mdl.subscriber_id = sa.subscriber_id 
            AND sa.campaign_id = ? 
            AND sa.type = 'receive_email'
        WHERE mdl.campaign_id = ? 
        AND mdl.status = 'success'
        AND sa.id IS NULL
    ");
    $stmt->execute([$cid, $cid]);
    $missingReceives = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $missingCount = count($missingReceives);

    echo "Found $missingCount missing 'receive_email' activities.\n";

    if (isset($_GET['commit']) && $missingCount > 0) {
        echo "Restoring receive_email logs...\n";
        $pdo->beginTransaction();
        $batchSize = 100;
        $totalRestored = 0;

        for ($i = 0; $i < $missingCount; $i += $batchSize) {
            $batch = array_slice($missingReceives, $i, $batchSize);
            $vals = [];
            $binds = [];
            foreach ($batch as $row) {
                $binds[] = "(?, 'receive_email', ?, ?, 'Campaign Sent (Restored)', ?, ?)";
                $vals = array_merge($vals, [$row['subscriber_id'], $cid, $cName, $cid, $row['sent_at']]);
            }
            $sql = "INSERT INTO subscriber_activity (subscriber_id, type, reference_id, reference_name, details, campaign_id, created_at) VALUES " . implode(',', $binds);
            $pdo->prepare($sql)->execute($vals);
            $totalRestored += count($batch);
        }
        $pdo->commit();
        echo "Successfully restored $totalRestored activities.\n";
    }

    // 3. Link orphaned opens/clicks
    echo "\nSearching for orphaned 'open_email' / 'click_link' logs...\n";
    // We look for activities with NO campaign_id but belonging to subscribers of this campaign
    $stmt = $pdo->prepare("
        SELECT sa.id, sa.type, sa.created_at
        FROM subscriber_activity sa
        JOIN mail_delivery_logs mdl ON sa.subscriber_id = mdl.subscriber_id
        WHERE sa.type IN ('open_email', 'click_link')
        AND (sa.campaign_id IS NULL OR sa.campaign_id = '')
        AND mdl.campaign_id = ?
        AND sa.created_at >= mdl.sent_at
        AND sa.created_at <= DATE_ADD(mdl.sent_at, INTERVAL 7 DAY)
    ");
    $stmt->execute([$cid]);
    $orphans = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $orphanCount = count($orphans);

    echo "Found $orphanCount orphaned engagement activities.\n";

    if (isset($_GET['commit']) && $orphanCount > 0) {
        echo "Linking orphans to Campaign $cid...\n";
        $pdo->beginTransaction();
        $orphanIds = array_column($orphans, 'id');
        $placeholders = implode(',', array_fill(0, count($orphanIds), '?'));
        $stmtUpdate = $pdo->prepare("UPDATE subscriber_activity SET campaign_id = ? WHERE id IN ($placeholders)");
        $stmtUpdate->execute(array_merge([$cid], $orphanIds));
        $pdo->commit();
        echo "Successfully linked $orphanCount activities.\n";
    }

    echo "\nRecovery complete.\n";

} catch (Exception $e) {
    if ($pdo->inTransaction())
        $pdo->rollBack();
    echo "Error: " . $e->getMessage();
}
