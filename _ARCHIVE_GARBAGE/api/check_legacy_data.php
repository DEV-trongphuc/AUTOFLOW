<?php
require_once 'db_connect.php';

$sql = "SELECT os, location, COUNT(*) as count FROM subscriber_activity WHERE os = 'Unknown OS' OR location LIKE '%Paris%' GROUP BY os, location";
$stmt = $pdo->query($sql);
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "<pre>";
print_r($results);
echo "</pre>";
?>