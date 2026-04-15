<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once __DIR__ . '/db_connect.php';

$flowId = '69dca73f0d951';
$stmt = $pdo->prepare("UPDATE flows SET status = 'paused' WHERE id = ?");
$stmt->execute([$flowId]);

echo "SUCCESS: ÐÃ T?M D?NG TOÀN B? FLOW L?I Ð? AN TOÀN!";
?>
