<?php
require_once 'db_connect.php';

$tables = ['activity_log', 'web_page_views', 'ai_messages', 'subscribers', 'campaigns', 'flows'];
$results = [];

foreach ($tables as $t) {
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `$t`");
        $cols = $stmt->fetchAll(PDO::FETCH_COLUMN);
        $results[$t] = in_array('workspace_id', $cols) ? "YES" : "NO (Cols: " . implode(", ", $cols) . ")";
    } catch(Exception $e) {
        $results[$t] = "ERROR: " . $e->getMessage();
    }
}
echo json_encode($results, JSON_PRETTY_PRINT);
