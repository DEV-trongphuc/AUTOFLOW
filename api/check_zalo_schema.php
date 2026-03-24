<?php
require_once 'db_connect.php';

echo "Table: zalo_lists\n";
$stmt = $pdo->query("DESCRIBE zalo_lists");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "\nTable: zalo_subscribers\n";
$stmt = $pdo->query("DESCRIBE zalo_subscribers");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
