<?php
require_once 'db_connect.php';
$stmt = $pdo->query("SELECT id, name, category FROM templates");
$templates = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($templates, JSON_PRETTY_PRINT);
?>