<?php
require 'db_connect.php';

function runExplain($pdo, $sql) {
    echo "Query: $sql\n";
    try {
        $stmt = $pdo->query("EXPLAIN " . $sql);
        $res = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach($res as $row) {
            echo "  table: " . $row['table'] . " | type: " . $row['type'] . " | possible_keys: " . $row['possible_keys'] . " | key: " . $row['key'] . " | rows: " . $row['rows'] . " | Extra: " . $row['Extra'] . "\n";
        }
    } catch(Exception $e) {
        echo "  Error: " . $e->getMessage() . "\n";
    }
    echo "\n";
}

runExplain($pdo, "SELECT * FROM subscriber_activity WHERE subscriber_id = 1 AND created_at >= '2026-01-01' ORDER BY created_at DESC LIMIT 500");
runExplain($pdo, "SELECT * FROM subscriber_flow_states WHERE status = 'waiting' AND scheduled_at <= NOW() ORDER BY created_at ASC LIMIT 200 FOR UPDATE SKIP LOCKED");
runExplain($pdo, "SELECT status, COUNT(*) FROM mail_delivery_logs WHERE campaign_id = 1 GROUP BY status");
runExplain($pdo, "SELECT type, COUNT(*), COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = 1 AND type IN ('click_link', 'open_email') GROUP BY type");
runExplain($pdo, "SELECT * FROM subscribers WHERE workspace_id = 1 AND status IN ('active','lead','customer') LIMIT 200");
runExplain($pdo, "SELECT status, COUNT(*) FROM zalo_delivery_logs WHERE flow_id = 1 GROUP BY status");
runExplain($pdo, "SELECT * FROM queue_jobs WHERE status = 'pending' AND scheduled_at <= NOW() ORDER BY scheduled_at ASC, id ASC LIMIT 50");
