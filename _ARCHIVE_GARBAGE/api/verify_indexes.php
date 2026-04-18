<?php
// api/verify_indexes.php

require_once 'db_connect.php';

header('Content-Type: application/json');

// Exact names from database_indexes_performance.sql
$expectedIndexes = [
    'subscribers' => [
        'idx_subscribers_status',
        'idx_subscribers_status_joined',
        'idx_subscribers_joined_at',
        'idx_subscribers_last_activity',
        'idx_subscribers_lead_score' // Added this one
    ],
    'subscriber_activity' => [
        'idx_subscriber_activity_campaign_lookup',
        'idx_subscriber_activity_campaign_type',
        'idx_subscriber_activity_created',
        'idx_subscriber_activity_flow_type',
        'idx_subscriber_activity_subscriber'
    ],
    'subscriber_flow_states' => [
        'idx_flow_states_processing',
        'idx_flow_states_subscriber',
        'idx_flow_states_updated',
        'idx_flow_states_flow_status_created'
    ],
    'mail_delivery_logs' => [
        'idx_mail_logs_campaign_status',
        'idx_mail_logs_recipient',
        'idx_mail_logs_reminder'
    ],
    'subscriber_lists' => [
        'idx_subscriber_lists_list',
        'idx_subscriber_lists_subscriber'
    ]
];

$results = [];
$missingCount = 0;

foreach ($expectedIndexes as $table => $indexes) {
    // Get current indexes
    $stmt = $pdo->prepare("SHOW INDEX FROM `$table`");
    $stmt->execute();
    $currentIndexes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $existingIndexNames = array_column($currentIndexes, 'Key_name');

    foreach ($indexes as $idxName) {
        if (in_array($idxName, $existingIndexNames)) {
            $results[$table][$idxName] = 'OK';
        } else {
            $results[$table][$idxName] = 'MISSING';
            $missingCount++;
        }
    }
}

echo json_encode([
    'status' => 'success',
    'missing_count' => $missingCount,
    'details' => $results
], JSON_PRETTY_PRINT);
