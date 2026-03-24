<?php
require_once 'db_connect.php';
$stmt = $pdo->query("DESCRIBE ai_org_conversations");
$cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($cols);
$stmt2 = $pdo->query("DESCRIBE ai_org_users");
$cols2 = $stmt2->fetchAll(PDO::FETCH_ASSOC);
echo "\n---\n";
echo json_encode($cols2);