<?php
require_once 'db_connect.php';
$stmt = $pdo->query("DESCRIBE meta_app_configs");
echo json_encode($stmt->fetchAll(), JSON_PRETTY_PRINT);
?>