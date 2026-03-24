<?php
require_once 'db_connect.php';

echo "Cleaning up outlier tracking data...\n";

// Cap duration to 2 hours
$stmt = $pdo->prepare("UPDATE web_sessions SET duration_seconds = 7200 WHERE duration_seconds > 7200");
$stmt->execute();
echo "Fixed " . $stmt->rowCount() . " sessions with excessive duration.\n";

// Cap page count to 200
$stmt = $pdo->prepare("UPDATE web_sessions SET page_count = 200 WHERE page_count > 200");
$stmt->execute();
echo "Fixed " . $stmt->rowCount() . " sessions with excessive page views.\n";

// Cap page views duration
$stmt = $pdo->prepare("UPDATE web_page_views SET time_on_page = 3600 WHERE time_on_page > 3600");
$stmt->execute();
echo "Fixed " . $stmt->rowCount() . " page views with excessive time.\n";

echo "Done.\n";
?>