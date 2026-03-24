<?php
require_once 'db_connect.php';

header("Content-Type: text/plain");

try {
    echo "=== DIAGNOSTIC: QUINCY SESSIONS ===\n";
    $stmt = $pdo->query("
        SELECT s.id, s.device_type, s.browser, s.os, v.ip_address, v.city
        FROM web_sessions s
        JOIN web_visitors v ON s.visitor_id = v.id
        WHERE v.city = 'Quincy' OR v.ip_address LIKE '40.77.%'
        LIMIT 20
    ");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as $r) {
        printf(
            "ID: %d | Device: %s | Browser: %s | OS: %s | IP: %s | City: %s\n",
            $r['id'],
            $r['device_type'],
            $r['browser'],
            $r['os'],
            $r['ip_address'],
            $r['city']
        );
    }

    echo "\n=== DIAGNOSTIC: UNKNOWN OS SESSIONS (Non-Bot) ===\n";
    $stmt2 = $pdo->query("
        SELECT s.id, v.city, v.ip_address, s.browser
        FROM web_sessions s
        JOIN web_visitors v ON s.visitor_id = v.id
        WHERE s.os = 'Unknown' AND s.device_type != 'bot'
        LIMIT 20
    ");
    $rows2 = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows2 as $r) {
        printf(
            "ID: %d | City: %s | IP: %s | Browser: %s\n",
            $r['id'],
            $r['city'],
            $r['ip_address'],
            $r['browser']
        );
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
