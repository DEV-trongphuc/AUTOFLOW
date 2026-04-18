<?php
require_once 'db_connect.php';
$stmt = $pdo->query("SELECT id, name, admin_id, property_id, source FROM global_assets WHERE is_deleted = 0 LIMIT 10");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
