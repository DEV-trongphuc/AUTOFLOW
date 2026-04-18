<?php
require_once 'db_connect.php';
$stmt = $pdo->query("SHOW COLUMNS FROM subscriber_activity");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
