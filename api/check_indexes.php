<?php
require_once 'db_connect.php';
try {
    $stmt = $pdo->query("SHOW INDEX FROM subscriber_activity");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
