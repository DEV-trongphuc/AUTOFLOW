<?php
// api/migrate_tags.php - 10M UPGRADE DATA MIGRATION
// Migrates tags from JSON field in 'subscribers' to relational 'subscriber_tags' table.

require_once 'db_connect.php';

if (php_sapi_name() !== 'cli' && !isset($_GET['run'])) {
    die("This script should be run from CLI or with ?run=1. Use with caution on production!");
}

$batchSize = 2000;
$offset = 0;
$totalMigrated = 0;

echo "Starting Tag Migration...\n";

// 1. Pre-fetch all tags into memory for speed
$stmtTags = $pdo->query("SELECT id, name FROM tags");
$tagMap = [];
while ($row = $stmtTags->fetch()) {
    $tagMap[strtolower($row['name'])] = $row['id'];
}

while (true) {
    $stmt = $pdo->prepare("SELECT id, tags FROM subscribers WHERE tags IS NOT NULL AND tags != '[]' AND tags != '' LIMIT ? OFFSET ?");
    $stmt->execute([$batchSize, $offset]);
    $subs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($subs))
        break;

    $pdo->beginTransaction();
    try {
        foreach ($subs as $sub) {
            $tags = json_decode($sub['tags'], true);
            if (!is_array($tags))
                continue;

            foreach ($tags as $tagName) {
                $tagNameLower = strtolower(trim($tagName));
                if (empty($tagNameLower))
                    continue;

                // Ensure tag exists in map
                if (!isset($tagMap[$tagNameLower])) {
                    $stmtInsTag = $pdo->prepare("INSERT INTO tags (id, name, created_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE name=name");
                    $newId = bin2hex(random_bytes(16));
                    $stmtInsTag->execute([$newId, $tagName]);

                    // Re-fetch or just use newId if insert actually happened
                    $stmtCheck = $pdo->prepare("SELECT id FROM tags WHERE name = ?");
                    $stmtCheck->execute([$tagName]);
                    $actualId = $stmtCheck->fetchColumn();
                    $tagMap[$tagNameLower] = $actualId;
                }

                $tagId = $tagMap[$tagNameLower];
                $pdo->prepare("INSERT IGNORE INTO subscriber_tags (subscriber_id, tag_id) VALUES (?, ?)")
                    ->execute([$sub['id'], $tagId]);
            }
            $totalMigrated++;
        }
        $pdo->commit();
        echo "Processed " . ($offset + count($subs)) . " subscribers...\n";
    } catch (Exception $e) {
        $pdo->rollBack();
        echo "Error at offset $offset: " . $e->getMessage() . "\n";
        exit(1);
    }

    $offset += $batchSize;
    // Add a small sleep to avoid slamming the DB if needed
    // usleep(100000); 
}

echo "Migration Complete! Total subscribers processed: $totalMigrated\n";
echo "Note: You can now safely clear the 'tags' column in the 'subscribers' table to save space.\n";
