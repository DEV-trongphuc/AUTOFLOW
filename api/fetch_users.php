<?php
require 'db_connect.php';
$stmt = $pdo->query("SELECT id, email, last_login, created_at FROM users");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
