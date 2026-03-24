<?php
require_once 'db_connect.php';
$stmt = $pdo->query("DESCRIBE subscriber_activity");
echo "<pre>";
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
echo "</pre>";
