<?php
require 'db_connect.php';
$stmt = $pdo->query("DESCRIBE meta_automation_scenarios");
header('Content-Type: application/json');
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
