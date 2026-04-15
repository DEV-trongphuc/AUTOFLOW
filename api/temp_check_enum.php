<?php
require 'db_connect.php';
$stmt = $pdo->query('SHOW CREATE TABLE flows;');
$res = $stmt->fetch(PDO::FETCH_ASSOC);
echo json_encode($res);
?>
