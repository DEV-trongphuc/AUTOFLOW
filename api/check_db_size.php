<?php
require_once 'db_connect.php';

header('Content-Type: application/json');

try {
    // Get database name
    $stmt = $pdo->query("SELECT DATABASE()");
    $dbName = $stmt->fetchColumn();

    // Query table sizes
    $sql = "
        SELECT 
            table_name AS `Table`, 
            round(((data_length + index_length) / 1024 / 1024), 2) `Size in MB`,
            table_rows AS `Rows`
        FROM information_schema.TABLES 
        WHERE table_schema = ?
        AND (table_name LIKE 'web_%' OR table_name = 'subscribers')
        ORDER BY (data_length + index_length) DESC;
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$dbName]);
    $tables = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'status' => 'success',
        'database' => $dbName,
        'tables' => $tables
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>