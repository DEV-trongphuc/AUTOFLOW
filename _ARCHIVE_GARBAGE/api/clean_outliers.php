<?php
header('Content-Type: text/plain');
require_once 'db_connect.php';

global $pdo;

echo "--- DELETING SESSIONS > 30 MINS ---\n";

// Delete sessions with duration > 30 minutes (1800 seconds)
// This will remove the session AND its associated page views (if cascade delete is set)
// Or we just delete the session row.
// Usually we want to keep the visitor but remove the faulty session.

$sql = "DELETE FROM web_sessions WHERE duration_seconds > 1800 AND property_id IS NOT NULL";
$stmt = $pdo->prepare($sql);
$stmt->execute();
$deleted = $stmt->rowCount();

echo "Deleted $deleted sessions with duration > 30 minutes.\n";

// Optional: Optimize table (if MySQL)
// $pdo->query("OPTIMIZE TABLE web_sessions");

echo "\nDone. Outliers removed. Please reload dashboard.\n";
