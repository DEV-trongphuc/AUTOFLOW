<?php
require_once 'db_connect.php';

header('Content-Type: application/json');

try {
    $stmt = $pdo->query("SELECT id, metadata, source_type, created_at FROM ai_training_docs");
    $docs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $count = 0;

    foreach ($docs as $doc) {
        $meta = json_decode($doc['metadata'] ?? '{}', true) ?: [];

        // If batch_id missing, generate one
        if (!isset($meta['batch_id'])) {
            // Generate deterministic batch_id based on source and ID to be safe, 
            // or just random if we want them separate.
            // User likely wants separate batches for existing separate files.

            $prefix = ($doc['source_type'] === 'manual') ? 'manual_' : (($doc['source_type'] === 'upload') ? 'upload_' : 'crawl_');
            // Use created_at timestamp to mimic the logic
            $ts = strtotime($doc['created_at']) * 1000;
            $meta['batch_id'] = $prefix . $ts . '_' . uniqid();

            $pdo->prepare("UPDATE ai_training_docs SET metadata = ? WHERE id = ?")
                ->execute([json_encode($meta), $doc['id']]);
            $count++;
        }
    }

    echo json_encode(['success' => true, 'updated_count' => $count]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
