<?php
// api/fix_duplicates_merge.php
// Merges duplicate subscribers based on Email or Phone
// Usage: php api/fix_duplicates_merge.php [execute]
// If 'execute' argument is not provided, it runs in Dry Run mode (Report only)

require_once 'db_connect.php';
require_once 'sync_engine.php';

// Increase limits
set_time_limit(0);
ini_set('memory_limit', '1024M');

$sapi = php_sapi_name();
$isCli = ($sapi === 'cli');

if (!$isCli) {
    // Web Mode
    header('Content-Type: text/plain; charset=utf-8');
    $mode = $_GET['action'] ?? 'dry_run';
} else {
    // CLI Mode
    $mode = $argv[1] ?? 'dry_run';
}

$execute = ($mode === 'execute');

echo "--------------------------------------------------------\n";
echo "DUPLICATE FINDER & MERGER " . ($execute ? "[EXECUTION MODE]" : "[DRY RUN]") . "\n";
echo "--------------------------------------------------------\n";

if ($mode !== 'dry_run' && $mode !== 'execute') {
    if ($isCli) {
        die("Usage: php api/fix_duplicates_merge.php [dry_run|execute]\n");
    } else {
        die("Usage: ?action=[dry_run|execute]\n");
    }
}

// 1. Load Data
echo "Loading subscribers...\n";
$stmt = $pdo->query("SELECT * FROM subscribers ORDER BY last_activity_at DESC, joined_at DESC");
$subs = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Total Subscribers: " . count($subs) . "\n";

$mapEmail = [];
$mapPhone = [];
$toMerge = []; // [ 'keep_id' => 'xxx', 'remove_id' => 'yyy', 'reason' => 'Same Email' ]

foreach ($subs as $sub) {
    $id = $sub['id'];
    $email = strtolower(trim($sub['email'] ?? ''));
    $phone = SyncEngine::normalizePhone($sub['phone_number'] ?? '');

    $matchId = null;
    $reason = '';

    // Check Email Match
    if ($email && isset($mapEmail[$email])) {
        $matchId = $mapEmail[$email];
        $reason = "Same Email ($email)";
    }
    // Check Phone Match
    elseif ($phone && isset($mapPhone[$phone])) {
        $matchId = $mapPhone[$phone];
        $reason = "Same Phone ($phone)";
    }

    if ($matchId) {
        // Found duplicate!
        // The one in $map is the "Primary" (because we ordered by Activity DESC, so first one we saw is 'better')
        // Actually, we iterate list. First one encountered is added to map.
        // So we should sort by Quality first, so first one is Keeper.
        // We did ORDER BY last_activity_at DESC. So first one is most active -> Keeper.
        $toMerge[] = [
            'keep_id' => $matchId,
            'remove_id' => $id,
            'reason' => $reason
        ];
        echo "Found Duplicate: ID $id ($reason) -> Merge into $matchId\n";
    } else {
        // New Unique, add to maps
        if ($email)
            $mapEmail[$email] = $id;
        if ($phone)
            $mapPhone[$phone] = $id;
    }
}

echo "--------------------------------------------------------\n";
echo "Found " . count($toMerge) . " duplicates to merge.\n";

if (empty($toMerge)) {
    echo "No duplicates found. Database is clean.\n";
    exit;
}

if (!$execute) {
    echo "Run 'php api/fix_duplicates_merge.php execute' to apply changes.\n";
    exit;
}

// EXECUTE MERGE
echo "Starting Merge...\n";
$count = 0;
foreach ($toMerge as $merge) {
    $keepId = $merge['keep_id'];
    $removeId = $merge['remove_id'];

    try {
        $pdo->beginTransaction();

        // 1. Move Lists
        $pdo->prepare("UPDATE IGNORE subscriber_lists SET subscriber_id = ? WHERE subscriber_id = ?")->execute([$keepId, $removeId]);

        // 2. Move Tags
        $pdo->prepare("UPDATE IGNORE subscriber_tags SET subscriber_id = ? WHERE subscriber_id = ?")->execute([$keepId, $removeId]);

        // 3. Move Activity Log
        $pdo->prepare("UPDATE activity_log SET subscriber_id = ? WHERE subscriber_id = ?")->execute([$keepId, $removeId]);

        // 4. Move Message Logs
        $pdo->prepare("UPDATE message_logs SET subscriber_id = ? WHERE subscriber_id = ?")->execute([$keepId, $removeId]);

        // 5. Move Orders / Conversions? (If any custom tables, add here)

        // 6. Merge Data Fields (If Primary is missing data that Duplicate has)
        // Check Duplicate Data
        $stmtDup = $pdo->prepare("SELECT * FROM subscribers WHERE id = ?");
        $stmtDup->execute([$removeId]);
        $dupData = $stmtDup->fetch(PDO::FETCH_ASSOC);

        // Check Keeper Data
        $stmtKeep = $pdo->prepare("SELECT * FROM subscribers WHERE id = ?");
        $stmtKeep->execute([$keepId]);
        $keepData = $stmtKeep->fetch(PDO::FETCH_ASSOC);

        $updateFields = [];
        $params = [];

        // Simple "Fill Empty" Strategy
        $fieldsToCheck = ['phone_number', 'first_name', 'last_name', 'gender', 'date_of_birth', 'avatar', 'city', 'country', 'job_title', 'company_name', 'meta_psid', 'zalo_user_id'];

        foreach ($fieldsToCheck as $f) {
            if (empty($keepData[$f]) && !empty($dupData[$f])) {
                $updateFields[] = "$f = ?";
                $params[] = $dupData[$f];
            }
        }

        if (!empty($updateFields)) {
            $params[] = $keepId;
            $pdo->prepare("UPDATE subscribers SET " . implode(', ', $updateFields) . " WHERE id = ?")->execute($params);
        }

        // 7. Delete Duplicate
        $pdo->prepare("DELETE FROM subscribers WHERE id = ?")->execute([$removeId]);

        // Cleanup leftover references (IGNORE statement above leaves existing links on removed user... wait)
        // UPDATE IGNORE means if (List A, User 2) exists and we try to change (List A, User 1) to (List A, User 2), it fails.
        // So User 1 remains in List A? No, the UPDATE statement fails for that row. 
        // We must DELETE the old links for ID 2 if we didn't move them?
        // Actually, if UPDATE IGNORE fails, the row stays as subscriber_id = removeId.
        // Then we DELETE subscribers WHERE id = removeId. The FK CASCADE should handle it?
        // Let's check table schema.

        // Assuming ON DELETE CASCADE on subscriber_lists/tags
        // If not, we manually delete.
        $pdo->prepare("DELETE FROM subscriber_lists WHERE subscriber_id = ?")->execute([$removeId]);
        $pdo->prepare("DELETE FROM subscriber_tags WHERE subscriber_id = ?")->execute([$removeId]);

        $pdo->commit();
        echo ".";
        $count++;

        if ($count % 50 == 0)
            echo " $count\n";

    } catch (Exception $e) {
        $pdo->rollBack();
        echo "\nFailed to merge $removeId into $keepId: " . $e->getMessage() . "\n";
    }
}

echo "\nDone! Merged $count subscribers.\n";
?>