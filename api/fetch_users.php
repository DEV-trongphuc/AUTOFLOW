<?php
require 'db_connect.php';
$stmt = $pdo->query("SELECT id, email, last_login, created_at FROM users");
header('Content-Type: application/json');
echo "[\n";
$first = true;
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    if (!$first) {
        echo ",\n";
    }
    echo json_encode($row);
    $first = false;
}
echo "\n]";
