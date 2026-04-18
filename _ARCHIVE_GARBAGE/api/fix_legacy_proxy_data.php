<?php
require_once 'db_connect.php';

// Fix Google Proxy (Paris + Unknown OS)
$sql = "UPDATE subscriber_activity 
        SET device_type = 'Proxy', os = 'Google Proxy', browser = 'Gmail' 
        WHERE os = 'Unknown OS' AND location LIKE '%Paris%'";

$stmt = $pdo->prepare($sql);
$stmt->execute();
$count = $stmt->rowCount();

echo "<h1>Data Cleanup Complete</h1>";
echo "<p>Updated <strong>$count</strong> records from 'Unknown OS (Paris)' to 'Google Proxy'.</p>";
echo "<p><a href='http://localhost/mailflow/api/check_legacy_data.php'>Check Again</a></p>";
?>