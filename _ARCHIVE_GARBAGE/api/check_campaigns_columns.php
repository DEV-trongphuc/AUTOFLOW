<?php
require_once 'db_connect.php';
try {
    $stmt = $pdo->query("SHOW COLUMNS FROM campaigns");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
