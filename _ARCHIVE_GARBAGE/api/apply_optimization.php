<?php
require_once 'db_connect.php';

header('Content-Type: application/json');

try {
    $sqlFile = __DIR__ . '/v11_optimization.sql';
    if (!file_exists($sqlFile)) {
        throw new Exception('SQL file not found at: ' . $sqlFile);
    }

    $sql = file_get_contents($sqlFile);

    // Split into individual queries (basic splitting by semicolon)
    // Note: This simple split might break if semicolons are inside strings, 
    // but for this specific file it's safe.
    $queries = array_filter(array_map('trim', explode(';', $sql)));

    $results = [];

    foreach ($queries as $query) {
        if (empty($query))
            continue;

        try {
            $pdo->exec($query);
            $results[] = ['query' => substr($query, 0, 50) . '...', 'status' => 'success'];
        } catch (PDOException $e) {
            // Ignore "Duplicate key name" errors which mean index already exists
            if (strpos($e->getMessage(), 'Duplicate key name') !== false || strpos($e->getMessage(), 'during key definition') !== false) {
                $results[] = ['query' => substr($query, 0, 50) . '...', 'status' => 'skipped (exists)'];
            } else {
                $results[] = ['query' => substr($query, 0, 50) . '...', 'status' => 'error', 'message' => $e->getMessage()];
            }
        }
    }

    echo json_encode(['success' => true, 'results' => $results]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
