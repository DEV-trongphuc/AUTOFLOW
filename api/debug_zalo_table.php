<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

try {
    // Check if table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'zalo_oa_configs'");
    $tableExists = $stmt->fetch();

    if (!$tableExists) {
        echo json_encode([
            'success' => false,
            'message' => 'Table zalo_oa_configs does not exist'
        ]);
        exit;
    }

    // Check columns
    $stmt = $pdo->query("SHOW COLUMNS FROM zalo_oa_configs");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'table_exists' => true,
        'columns' => $columns
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>