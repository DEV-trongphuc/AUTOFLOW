<?php
require 'db_connect.php';
$stmt = $pdo->query("UPDATE meta_subscribers SET ai_paused_until = NULL WHERE ai_paused_until IS NOT NULL");
echo 'Cleared ' . $stmt->rowCount() . ' pauses.';
