<?php
require_once 'db_connect.php';
echo "--- global_assets schema ---\n";
$stmt = $pdo->query("DESCRIBE global_assets");
print_r($stmt->fetchAll());
