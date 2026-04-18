<?php
require_once 'db_connect.php';
$sqlFile = 'perf_fix_indexes.sql';
if (!file_exists($sqlFile)) {
    echo json_encode(['success' => false, 'message' => "File $sqlFile not found"]);
    exit;
}
$content = file_get_contents($sqlFile);
$queries = explode(';', $content);
$results = [];
foreach ($queries as $query) {
    $query = trim($query);
    if (empty($query) || strpos($query, '--') === 0) continue;
    try {
        $pdo->exec($query);
        $results[] = ['query' => substr($query, 0, 50) . '...', 'success' => true];
    } catch (Exception $e) {
        $results[] = ['query' => substr($query, 0, 50) . '...', 'success' => false, 'error' => $e->getMessage()];
    }
}
echo json_encode(['success' => true, 'results' => $results]);
