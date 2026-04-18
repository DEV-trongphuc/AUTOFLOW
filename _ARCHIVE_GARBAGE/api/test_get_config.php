<?php
require 'db_connect.php';
$stmt = $pdo->query("SELECT config FROM flows WHERE id = '69dca73f0d951'");
echo $stmt->fetchColumn();
?>
