<?php
require_once 'db_connect.php';
$stmt = $pdo->query("SELECT * FROM meta_message_logs WHERE direction = 'outbound' ORDER BY created_at DESC LIMIT 5");
$logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "--- Last 5 meta message logs ---\n";
print_r($logs);
?>