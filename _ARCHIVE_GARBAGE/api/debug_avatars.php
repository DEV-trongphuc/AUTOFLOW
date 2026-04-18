<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

try {
    $results = [];

    // Check meta_app_configs
    $stmt = $pdo->query("SHOW COLUMNS FROM meta_app_configs");
    $results['meta_app_configs'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Check zalo_oa_configs
    $stmt = $pdo->query("SHOW COLUMNS FROM zalo_oa_configs");
    $results['zalo_oa_configs'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Check some sample data to see if avatars are populated
    $stmt = $pdo->query("SELECT page_name, avatar_url FROM meta_app_configs LIMIT 5");
    $results['meta_samples'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $stmt = $pdo->query("SELECT name, avatar FROM zalo_oa_configs LIMIT 5");
    $results['zalo_samples'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($results, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>