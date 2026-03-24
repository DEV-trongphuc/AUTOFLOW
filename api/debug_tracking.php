<?php
require 'api/db_connect.php';
$sql = "SELECT visitor_id, session_id, url, loaded_at 
        FROM web_page_views 
        WHERE loaded_at >= '2026-01-09 09:00:00' 
        AND (url LIKE '%hoach-dinh-chien-luoc-la-gi.html' OR url LIKE '%swiss-umef%') 
        ORDER BY loaded_at ASC";
$res = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($res, JSON_PRETTY_PRINT);
