<?php
require_once 'db_connect.php';
try {
    $stmt = $pdo->query("SHOW COLUMNS FROM zalo_oa_configs");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC), JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo $e->getMessage();
}
