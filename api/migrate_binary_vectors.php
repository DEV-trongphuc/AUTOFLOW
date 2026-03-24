<?php
// api/migrate_binary_vectors.php
require_once 'db_connect.php';

header('Content-Type: text/plain');
echo "Starting Binary Vector Migration...\n";

try {
    // 1. Ensure columns exist (Defensive)
    echo "Checking schema...\n";
    $cols = $pdo->query("SHOW COLUMNS FROM ai_training_chunks")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('embedding_binary', $cols)) {
        echo "Adding embedding_binary to ai_training_chunks...\n";
        $pdo->exec("ALTER TABLE ai_training_chunks ADD COLUMN embedding_binary LONGBLOB AFTER embedding");
    }

    $colsCache = $pdo->query("SHOW COLUMNS FROM ai_vector_cache")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('vector_binary', $colsCache)) {
        echo "Adding vector_binary to ai_vector_cache...\n";
        $pdo->exec("ALTER TABLE ai_vector_cache ADD COLUMN vector_binary LONGBLOB AFTER vector");
    }

    // 2. Backfill ai_training_chunks
    echo "Backfilling ai_training_chunks (this may take a while)...\n";
    $stmt = $pdo->query("SELECT id, embedding FROM ai_training_chunks WHERE embedding_binary IS NULL AND embedding IS NOT NULL");
    $rowCount = 0;

    $updateStmt = $pdo->prepare("UPDATE ai_training_chunks SET embedding_binary = ? WHERE id = ?");

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $vector = json_decode($row['embedding'], true);
        if ($vector && is_array($vector)) {
            $packed = pack('f*', ...$vector);
            $updateStmt->execute([$packed, $row['id']]);
            $rowCount++;
            if ($rowCount % 100 === 0)
                echo "Processed $rowCount chunks...\n";
        }
    }
    echo "Finished backfilling $rowCount chunks in ai_training_chunks.\n";

    // 3. Backfill ai_vector_cache
    echo "Backfilling ai_vector_cache...\n";
    $stmtCache = $pdo->query("SELECT hash, vector FROM ai_vector_cache WHERE vector_binary IS NULL AND vector IS NOT NULL");
    $cacheCount = 0;

    $updateCacheStmt = $pdo->prepare("UPDATE ai_vector_cache SET vector_binary = ? WHERE hash = ?");

    while ($row = $stmtCache->fetch(PDO::FETCH_ASSOC)) {
        $vector = json_decode($row['vector'], true);
        if ($vector && is_array($vector)) {
            $packed = pack('f*', ...$vector);
            $updateCacheStmt->execute([$packed, $row['hash']]);
            $cacheCount++;
            if ($cacheCount % 100 === 0)
                echo "Processed $cacheCount cache items...\n";
        }
    }
    echo "Finished backfilling $cacheCount items in ai_vector_cache.\n";

    echo "Migration completed successfully!\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
