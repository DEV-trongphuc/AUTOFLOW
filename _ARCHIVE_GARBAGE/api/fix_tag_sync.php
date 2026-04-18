<?php
// api/fix_tag_sync.php
require_once 'db_connect.php';

echo "<pre>--- FIXING TAG SYNCHRONIZATION --- \n";

try {
    $fid = 'ad16ed97-06b8-49a6-a8da-222c93191db0';
    $tagStepId = 'd327fe62-c975-4bbe-bb3a-a352c409de86';

    // 1. Get the exact tag name from flow config
    $stmtFlow = $pdo->prepare("SELECT steps FROM flows WHERE id = ?");
    $stmtFlow->execute([$fid]);
    $steps = json_decode($stmtFlow->fetchColumn(), true);

    $targetTag = null;
    foreach ($steps as $s) {
        if ($s['id'] === $tagStepId) {
            $targetTag = $s['config']['tags'][0] ?? null;
            break;
        }
    }

    if (!$targetTag) {
        throw new Exception("Could not find tag configuration in flow step.");
    }

    echo "Target Tag from Flow: <b>$targetTag</b>\n";

    // 2. Ensure tag exists in 'tags' table
    $stmtT = $pdo->prepare("SELECT id FROM tags WHERE name = ? LIMIT 1");
    $stmtT->execute([$targetTag]);
    $tagId = $stmtT->fetchColumn();

    if (!$tagId) {
        echo "Tag '$targetTag' missing! Creating it now...\n";
        $stmtInsTag = $pdo->prepare("INSERT INTO tags (name, created_at) VALUES (?, NOW())");
        $stmtInsTag->execute([$targetTag]);
        $tagId = $pdo->lastInsertId();
    }
    echo "Using Tag ID: $tagId\n";

    // 3. Find all 11 subscribers who passed this step
    $stmtSubs = $pdo->prepare("SELECT subscriber_id FROM subscriber_flow_states WHERE flow_id = ? AND status = 'completed'");
    $stmtSubs->execute([$fid]);
    $subs = $stmtSubs->fetchAll(PDO::FETCH_COLUMN);

    echo "Found " . count($subs) . " subscribers to fix.\n";

    $applied = 0;
    foreach ($subs as $sid) {
        $stmtIn = $pdo->prepare("INSERT IGNORE INTO subscriber_tags (subscriber_id, tag_id) VALUES (?, ?)");
        $stmtIn->execute([$sid, $tagId]);
        if ($stmtIn->rowCount() > 0) {
            $applied++;
            echo "  - Applied tag to Sub ID: $sid\n";
        }
    }

    echo "\nSUCCESS: Fixed tag for $applied subscribers.\n";
    echo "Check their profiles now, the tag '$targetTag' will be there!";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
echo "</pre>";
