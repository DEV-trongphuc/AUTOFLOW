<?php
require_once 'db_connect.php';

$_SESSION['user_id'] = 1;
$_SESSION['last_login_update_time'] = 0;

try {
    $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = ?")->execute([$_SESSION['user_id']]);
    echo "SUCCESS\n";
    $stmt = $pdo->query("SELECT last_login FROM users WHERE id = 1");
    echo "DB TIME: " . $stmt->fetchColumn() . "\n";
    echo "PHP TIME: " . date('Y-m-d H:i:s') . "\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
