<?php
require_once 'db_connect.php';
header('Content-Type: application/json');

$results = [];

try {
    // 1. Schema check
    $stmt = $pdo->query("DESCRIBE subscribers");
    $results['schema'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Search test
    $search = $_GET['search'] ?? 'tunriod';
    $searchTerm = "%" . strtolower(trim($search)) . "%";
    $stmt = $pdo->prepare("SELECT id, email, first_name, last_name, workspace_id FROM subscribers WHERE LOWER(email) LIKE ? OR LOWER(first_name) LIKE ? OR LOWER(last_name) LIKE ? LIMIT 10");
    $stmt->execute([$searchTerm, $searchTerm, $searchTerm]);
    $results['search_results'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Sample Data (To see what's actually there)
    $stmt = $pdo->query("SELECT id, email, first_name, last_name, workspace_id FROM subscribers ORDER BY joined_at DESC LIMIT 10");
    $results['sample_subscribers'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Check specific email
    $stmt = $pdo->prepare("SELECT id, email, workspace_id FROM subscribers WHERE email = ?");
    $stmt->execute([trim($search)]);
    $results['exact_match'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'data' => $results], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
