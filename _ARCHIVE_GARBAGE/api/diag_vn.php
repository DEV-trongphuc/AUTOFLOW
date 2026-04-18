<?php
require_once 'db_connect.php';
header("Content-Type: text/plain");

try {
    echo "=== DB CHECK: VN VISITORS STILL MARKED AS BOTS ===\n";
    $stmt = $pdo->query("
        SELECT s.id, s.device_type, s.browser, v.city, v.ip_address, s.os
        FROM web_sessions s
        JOIN web_visitors v ON s.visitor_id = v.id
        WHERE v.city LIKE '%Ho Chi Minh%' OR v.country = 'Vietnam' OR v.ip_address LIKE '113.%'
        LIMIT 50
    ");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $r) {
        printf(
            "ID: %d | Type: %s | Browser: %s | OS: %s | City: %s | IP: %s\n",
            $r['id'],
            $r['device_type'],
            $r['browser'],
            $r['os'],
            $r['city'],
            $r['ip_address']
        );
    }

    echo "\n=== DB CHECK: RECENT BOTS ===\n";
    $stmt2 = $pdo->query("SELECT id, device_type, browser, started_at FROM web_sessions WHERE device_type = 'bot' ORDER BY started_at DESC LIMIT 10");
    $rows2 = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows2 as $r) {
        printf("ID: %d | Browser: %s | Time: %s\n", $r['id'], $r['browser'], $r['started_at']);
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
