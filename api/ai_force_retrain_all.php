<?php
// api/ai_force_retrain_all.php
// Script to force retrain ALL active documents across ALL properties.
// Useful when chunking logic or embedding model changes.

require_once 'db_connect.php';
require_once 'ai_training.php'; // Reuse trainDocuments helper

header('Content-Type: text/plain; charset=utf-8');
header('X-Content-Type-Options: nosniff');

try {
    echo "--- MailFlow Pro: AI GLOBAL RETRAINING ---\n";
    echo "Time: " . date('Y-m-d H:i:s') . "\n\n";
    ob_end_flush(); // Ensure output is sent immediately
    flush();

    // 1. Get all active documents grouped by property_id
    $stmt = $pdo->query("SELECT id, property_id FROM ai_training_docs WHERE is_active = 1");
    $docsByProperty = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $docsByProperty[$row['property_id']][] = $row['id'];
    }

    $totalDocs = 0;
    $totalChunks = 0;
    $propertyCount = count($docsByProperty);

    echo "Found {$propertyCount} properties to process.\n";

    foreach ($docsByProperty as $propertyId => $docIds) {
        echo "Processing Property: [{$propertyId}] with " . count($docIds) . " documents...\n";

        // Pass propertyId to ensure we use the correct API Key / Settings for that property
        $successCount = trainDocuments($pdo, $docIds, $propertyId);

        $totalDocs += count($docIds);
        $totalChunks += $successCount;

        echo "Done Property [{$propertyId}]. Chunks created: {$successCount}\n";
        echo "-------------------------------------------\n";
        flush();
    }

    echo "--- GLOBAL RETRAINING COMPLETE ---\n";
    echo "Total Documents Processed: {$totalDocs}\n";
    echo "Total Chunks Created: {$totalChunks}\n";

} catch (Exception $e) {
    echo "CRITICAL ERROR: " . $e->getMessage() . "\n";
}
