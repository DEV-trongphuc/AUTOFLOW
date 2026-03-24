<?php
// api/test_optimization_pipeline.php
// Verifies that the new Buffered Architecture works correctly.

// Enable Output Buffering and Errors
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// HTML Friendly Output Helper
function out($msg)
{
    if (php_sapi_name() !== 'cli') {
        echo $msg . "<br>\n";
        ob_flush();
        flush();
    } else {
        echo strip_tags($msg) . "\n";
    }
}

// 1. Mock Request
$_SERVER['SCRIPT_FILENAME'] = 'test_runner.php';
require_once 'db_connect.php';
require_once 'worker_tracking_aggregator.php';

// RE-ENABLE ERRORS (Worker disabled them)
ini_set('display_errors', 1);
error_reporting(E_ALL);

out("<b>--- STARTING PIPELINE TEST ---</b>");

try {

    // A. Setup & Clean slate
    try {
        // Ensure tables exist (Self-Healing Test)
        $pdo->exec("CREATE TABLE IF NOT EXISTS raw_event_buffer (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            type VARCHAR(50) NOT NULL,
            payload JSON NOT NULL,
            processed TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_processed (processed)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        $pdo->exec("CREATE TABLE IF NOT EXISTS activity_buffer (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            subscriber_id VARCHAR(50) NOT NULL,
            type VARCHAR(50) NOT NULL,
            details TEXT,
            reference_id VARCHAR(100),
            flow_id VARCHAR(50),
            campaign_id VARCHAR(50),
            extra_data JSON,
            processed TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_processed (processed)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        $pdo->exec("CREATE TABLE IF NOT EXISTS timestamp_buffer (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            subscriber_id VARCHAR(50) NOT NULL,
            column_name VARCHAR(50) NOT NULL,
            timestamp_value DATETIME NOT NULL,
            processed TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_processed (processed),
            INDEX idx_sub_col (subscriber_id, column_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        $pdo->exec("CREATE TABLE IF NOT EXISTS stats_update_buffer (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            target_table VARCHAR(50) NOT NULL,
            target_id VARCHAR(100) NOT NULL,
            column_name VARCHAR(50) NOT NULL,
            increment INT DEFAULT 1,
            batch_id VARCHAR(50) DEFAULT NULL,
            processed TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_batch (batch_id),
            INDEX idx_processed (processed)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        $pdo->exec("TRUNCATE TABLE raw_event_buffer");
        $pdo->exec("TRUNCATE TABLE activity_buffer");
        $pdo->exec("TRUNCATE TABLE timestamp_buffer");
        $pdo->exec("TRUNCATE TABLE stats_update_buffer");
        out("[INFO] Tables Checked & Truncated for Clean Test.");
    } catch (Exception $e) {
        out("[WARN] Could not truncate tables: " . $e->getMessage() . ". Using DELETE instead.");
        $pdo->exec("DELETE FROM raw_event_buffer");
        $pdo->exec("DELETE FROM activity_buffer");
        $pdo->exec("DELETE FROM timestamp_buffer");
        $pdo->exec("DELETE FROM stats_update_buffer");
    }

    // Create a dummy subscriber if needed
    $testEmail = "optim_test_" . time() . "@example.com";
    $testSid = "test_optim_" . time();
    // [FIX] Use joined_at instead of created_at
    $pdo->prepare("INSERT INTO subscribers (id, email, status, joined_at) VALUES (?, ?, 'active', NOW()) ON DUPLICATE KEY UPDATE id=id")->execute([$testSid, $testEmail]);

    out("[SETUP] Created/Verified test subscriber: <code>$testSid</code>");

    // B. Simulate Webhook (Insert into raw_event_buffer)
    out("[STEP 1] Simulating Webhook Open Event...");
    $payload = json_encode([
        'sid' => $testSid,
        'cid' => 'test_camp_1',
        'fid' => 'test_flow_1',
        'rid' => 'ref_123', // [FIX] Added missing RID to payload
        'extra_data' => ['location' => 'Pipeline Test City']
    ]);

    // Check if table exists first!
    try {
        $pdo->prepare("INSERT INTO raw_event_buffer (type, payload) VALUES ('open', ?)")->execute([$payload]);
    } catch (Exception $e) {
        die("[FATAL] raw_event_buffer Insert Failed: " . $e->getMessage());
    }

    // C. Run Aggregator Worker (Manually trigger logic)
    out("[STEP 2] Running Aggregator Worker Simulation...");

    // --- RAW PROCESSING SIMULATION ---
    // NO TRANSACTION HERE to allow DDL Fallback inside processTrackingEvent
    $stmt = $pdo->prepare("SELECT id, type, payload FROM raw_event_buffer WHERE processed = 0 LIMIT 1");
    $stmt->execute();
    $event = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($event) {
        out(" -> Found Raw Event: <b>{$event['type']}</b>");
        $p = json_decode($event['payload'], true);

        require_once 'tracking_processor.php';

        processTrackingEvent($pdo, 'stat_update', [
            'type' => 'open_email',
            'subscriber_id' => $p['sid'],
            'campaign_id' => $p['cid'],
            'flow_id' => $p['fid'],
            'reference_id' => $p['rid'] ?? null,
            'extra_data' => $p['extra_data']
        ]);

        $pdo->prepare("UPDATE raw_event_buffer SET processed = 1 WHERE id = ?")->execute([$event['id']]);
        out(" -> Raw Event Processed.");
    } else {
        out(" <span style='color:red'>[ERROR] No raw event found!</span>");
    }
    // Transaction blocking removed

    // D. Run Buffer Syncs (The new functions)
    out("[STEP 3] Syncing Buffers...");

    out(" -> Syncing Activity Buffer...");
    syncActivityBuffer($pdo);

    out(" -> Syncing Timestamp Buffer...");
    syncTimestampBuffer($pdo);

    out(" -> Syncing Stats Buffer...");
    syncStatsBuffer($pdo);

    // E. Verification
    out("[STEP 4] Verifying Results...");

    // 1. Check Subscriber Activity
    $stmtAct = $pdo->prepare("SELECT * FROM subscriber_activity WHERE subscriber_id = ? AND type = 'open_email'");
    $stmtAct->execute([$testSid]);
    $act = $stmtAct->fetch(PDO::FETCH_ASSOC);
    if ($act) {
        out(" <span style='color:green'>[PASS] Activity Logged: " . $act['details'] . "</span>");
    } else {
        out(" <span style='color:red'>[FAIL] Activity NOT found in subscriber_activity!</span>");
        // Check buffer
        $checkBuf = $pdo->query("SELECT * FROM activity_buffer")->fetchAll();
        out("   -> Debug: Activity Buffer Count: " . count($checkBuf));
        if (count($checkBuf) > 0)
            out("   -> Debug: First item processed? " . $checkBuf[0]['processed']);
    }

    // 2. Check Subscriber Timestamp
    $stmtSub = $pdo->prepare("SELECT last_open_at FROM subscribers WHERE id = ?");
    $stmtSub->execute([$testSid]);
    $subInDb = $stmtSub->fetch(PDO::FETCH_ASSOC);
    if ($subInDb && $subInDb['last_open_at']) {
        out(" <span style='color:green'>[PASS] Subscriber last_open_at updated: " . $subInDb['last_open_at'] . "</span>");
    } else {
        out(" <span style='color:red'>[FAIL] Subscriber last_open_at NOT updated!</span>");
        // Check buffer
        $checkBuf = $pdo->query("SELECT * FROM timestamp_buffer")->fetchAll();
        out("   -> Debug: Timestamp Buffer Count: " . count($checkBuf));
    }

    // 3. Check Stats
    $stmtStatBuf = $pdo->query("SELECT COUNT(*) FROM stats_update_buffer WHERE processed = 0");
    $remainingStats = $stmtStatBuf->fetchColumn();
    if ($remainingStats == 0) {
        out(" <span style='color:green'>[PASS] Stats Buffer processed (0 remaining).</span>");
    } else {
        out(" <span style='color:red'>[FAIL] Stats Buffer has $remainingStats remaining items.</span>");
    }

    out("<b>--- TEST COMPLETE ---</b>");

} catch (Throwable $e) {
    out("<span style='color:red'>[CRITICAL ERROR] Script Crashed: " . $e->getMessage() . " on line " . $e->getLine() . "</span>");
}
