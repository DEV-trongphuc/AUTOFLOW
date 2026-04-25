<?php
require_once 'e:\AUTOFLOW\AUTOMATION_FLOW\api\db_connect.php';
$stmt = $pdo->query("SHOW CREATE TABLE web_events");
print_r($stmt->fetch(PDO::FETCH_ASSOC));
