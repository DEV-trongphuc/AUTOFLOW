<?php
// api/VerifyIndexes.php
require_once 'db_connect.php';

function verifyIndexes($pdo)
{
    $requiredIndexes = [
        'ai_conversations' => ['idx_property_last_message', 'idx_visitor_id'],
        'ai_messages' => ['idx_conversation_id_desc'],
        'subscribers' => ['idx_meta_psid', 'idx_zalo_user_id'],
        'subscriber_activity' => ['subscriber_id', 'type', 'created_at'], // example of composite
        'stats_update_buffer' => ['idx_batch', 'idx_processed'],
        'raw_event_buffer' => ['idx_processed'],
        'timestamp_buffer' => ['idx_processed']
    ];

    $results = [];

    foreach ($requiredIndexes as $table => $indexes) {
        $results[$table] = [];
        try {
            $stmt = $pdo->prepare("SHOW INDEX FROM $table");
            $stmt->execute();
            $existingIndexes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $existingNames = array_column($existingIndexes, 'Key_name');

            foreach ($indexes as $index) {
                $status = in_array($index, $existingNames) ? 'OK' : 'MISSING';
                $results[$table][$index] = $status;
            }
        } catch (Exception $e) {
            $results[$table]['error'] = "Table not found or error: " . $e->getMessage();
        }
    }

    return $results;
}

// Run if called directly
if (basename($_SERVER['SCRIPT_FILENAME']) === 'VerifyIndexes.php') {
    $report = verifyIndexes($pdo);
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'report' => $report], JSON_PRETTY_PRINT);
}
