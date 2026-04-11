<?php
require_once 'db_connect.php';
$stmt = $pdo->query('SHOW FULL PROCESSLIST');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
