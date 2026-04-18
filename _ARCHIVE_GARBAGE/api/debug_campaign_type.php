<?php
require_once 'db_connect.php';
$stmt = $pdo->query("SELECT id, name, type, status FROM campaigns ORDER BY created_at DESC LIMIT 5");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
