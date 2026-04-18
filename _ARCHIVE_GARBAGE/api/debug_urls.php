<?php
require_once 'db_connect.php';
$stmt = $pdo->query("SELECT session_id, COUNT(DISTINCT url_hash) as unique_urls, COUNT(*) as total_views FROM web_page_views GROUP BY session_id HAVING total_views > 0 LIMIT 20");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC), JSON_PRETTY_PRINT);
?>