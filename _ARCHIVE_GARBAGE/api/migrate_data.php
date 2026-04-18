<?php
require_once 'db_connect.php';

$sourceProp = 'ce71ea2e-d841-4e0f-b3ad-332297cde330';
$targetProp = '7c9a7040-a163-40dc-8e29-a1706a160564';

try {
    $pdo->beginTransaction();

    // 1. Map old IDs to new IDs for docs/folders
    $idMapping = []; // [old_id => new_id]

    // Fetch all docs from source
    $stmt = $pdo->prepare("SELECT * FROM ai_training_docs WHERE property_id = ?");
    $stmt->execute([$sourceProp]);
    $sourceDocs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Found " . count($sourceDocs) . " documents in source property.\n";

    // 2. Generate new IDs and insert Docs
    // We do this in two passes or carefully to handle parent_id.
    // Pass 1: Create all docs with original properties but new IDs, mapping old to new.
    foreach ($sourceDocs as $doc) {
        $newDocId = bin2hex(random_bytes(18));
        $idMapping[$doc['id']] = $newDocId;
    }

    $stmtInsertDoc = $pdo->prepare("INSERT INTO ai_training_docs (id, property_id, name, source_type, is_active, status, priority, content, tags, metadata, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())");

    foreach ($sourceDocs as $doc) {
        $newId = $idMapping[$doc['id']];
        $newParentId = ($doc['parent_id'] && isset($idMapping[$doc['parent_id']])) ? $idMapping[$doc['parent_id']] : '0';

        $stmtInsertDoc->execute([
            $newId,
            $targetProp,
            $doc['name'],
            $doc['source_type'],
            $doc['is_active'],
            $doc['status'],
            $doc['priority'],
            $doc['content'],
            $doc['tags'],
            $doc['metadata'],
            $newParentId
        ]);
    }

    echo "Successfully copied " . count($sourceDocs) . " documents to target property.\n";

    // 3. Copy Chunks
    $stmtChunks = $pdo->prepare("SELECT * FROM ai_training_chunks WHERE property_id = ?");
    $stmtChunks->execute([$sourceProp]);
    $sourceChunks = $stmtChunks->fetchAll(PDO::FETCH_ASSOC);

    echo "Found " . count($sourceChunks) . " chunks in source property.\n";

    $stmtInsertChunk = $pdo->prepare("INSERT INTO ai_training_chunks (id, doc_id, property_id, content, metadata_text, embedding, embedding_binary, vector_norm, tags, priority_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    $copiedChunks = 0;
    foreach ($sourceChunks as $chunk) {
        if (!isset($idMapping[$chunk['doc_id']]))
            continue; // Skip if doc wasn't copied

        $newChunkId = bin2hex(random_bytes(18));
        $newDocId = $idMapping[$chunk['doc_id']];

        $stmtInsertChunk->execute([
            $newChunkId,
            $newDocId,
            $targetProp,
            $chunk['content'],
            $chunk['metadata_text'],
            $chunk['embedding'],
            $chunk['embedding_binary'],
            $chunk['vector_norm'],
            $chunk['tags'],
            $chunk['priority_level']
        ]);
        $copiedChunks++;
    }

    echo "Successfully copied $copiedChunks chunks to target property.\n";

    // 4. Invalidate RAG Cache for target
    $cacheFile = __DIR__ . "/cache/rag_cache_{$targetProp}.json";
    if (file_exists($cacheFile)) {
        unlink($cacheFile);
        echo "Invalidated RAG cache for target property.\n";
    }

    $pdo->commit();
    echo "DONE. Data migration completed successfully.\n";

} catch (Exception $e) {
    if ($pdo->inTransaction())
        $pdo->rollBack();
    echo "ERROR: " . $e->getMessage() . "\n";
}
?>