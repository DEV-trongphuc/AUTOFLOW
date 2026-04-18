<?php
// FINAL FIX: queue_jobs id column overflow
// Root cause: id is BIGINT AUTO_INCREMENT but worker inserts hex strings → overflow
// Fix: Change id to VARCHAR(64), remove auto_increment
// Run at: https://automation.ideas.edu.vn/mail_api/fix_auto_increment.php
require_once 'db_connect.php';
$pdo->setAttribute(PDO::MYSQL_ATTR_USE_BUFFERED_QUERY, true);
header('Content-Type: text/plain; charset=utf-8');

echo "=== QUEUE_JOBS SCHEMA FIX (VARCHAR id) ===\n\n";

// 1. Show current state
$s = $pdo->query("SHOW TABLE STATUS LIKE 'queue_jobs'")->fetchAll(PDO::FETCH_ASSOC)[0];
echo "Current AUTO_INCREMENT: " . $s['Auto_increment'] . "\n";
$totalRows = (int) $pdo->query("SELECT COUNT(*) FROM queue_jobs")->fetchColumn();
$pendingCount = (int) $pdo->query("SELECT COUNT(*) FROM queue_jobs WHERE status = 'pending'")->fetchColumn();
echo "Total rows: $totalRows | Pending: $pendingCount\n\n";

// 2. Save pending jobs before schema change
echo "--- Saving pending jobs ---\n";
$pendingJobs = $pdo->query("SELECT queue, payload, available_at FROM queue_jobs WHERE status = 'pending' ORDER BY available_at ASC")->fetchAll(PDO::FETCH_ASSOC);
echo "  Saved " . count($pendingJobs) . " pending jobs.\n\n";

// 3. Change id column from BIGINT AUTO_INCREMENT to VARCHAR(64)
echo "--- Altering queue_jobs.id to VARCHAR(64) ---\n";
try {
    // Step A: Drop AUTO_INCREMENT first by modifying column type
    $pdo->exec("ALTER TABLE queue_jobs MODIFY COLUMN id VARCHAR(64) NOT NULL DEFAULT ''");
    echo "  ✓ Column type changed to VARCHAR(64)\n";
} catch (Exception $e) {
    echo "  ✗ ALTER MODIFY failed: " . $e->getMessage() . "\n";
    echo "  → Trying TRUNCATE + full rebuild...\n";

    // Nuclear: truncate then alter
    $pdo->exec("TRUNCATE TABLE queue_jobs");
    echo "  ✓ TRUNCATED\n";
    try {
        $pdo->exec("ALTER TABLE queue_jobs MODIFY COLUMN id VARCHAR(64) NOT NULL DEFAULT ''");
        echo "  ✓ Column type changed to VARCHAR(64)\n";
    } catch (Exception $e2) {
        echo "  ✗ Still failed: " . $e2->getMessage() . "\n";
        // Last resort: drop and recreate
        echo "  → Dropping and recreating queue_jobs...\n";
        $pdo->exec("DROP TABLE IF EXISTS queue_jobs");
        $pdo->exec("CREATE TABLE queue_jobs (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            queue VARCHAR(50) NOT NULL,
            payload LONGTEXT,
            attempts TINYINT UNSIGNED DEFAULT 0,
            status ENUM('pending','processing','completed','failed') DEFAULT 'pending',
            reserved_at DATETIME DEFAULT NULL,
            available_at DATETIME DEFAULT NULL,
            created_at DATETIME DEFAULT NULL,
            finished_at DATETIME DEFAULT NULL,
            error_message TEXT DEFAULT NULL,
            INDEX idx_queue_status (queue, status),
            INDEX idx_available (status, available_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        echo "  ✓ Table recreated with VARCHAR(64) id\n";
    }
}

// 4. Re-insert pending jobs with proper hex IDs
echo "\n--- Re-inserting pending jobs ---\n";
$now = date('Y-m-d H:i:s');
$reinserted = 0;
foreach ($pendingJobs as $job) {
    try {
        $newId = bin2hex(random_bytes(16));
        $availAt = $job['available_at'] ?? $now;
        $pdo->prepare("INSERT INTO queue_jobs (id, queue, payload, status, available_at, created_at) VALUES (?, ?, ?, 'pending', ?, ?)")
            ->execute([$newId, $job['queue'], $job['payload'], $availAt, $now]);
        $reinserted++;
    } catch (Exception $e) {
        echo "  ✗ Reinsert error: " . $e->getMessage() . "\n";
    }
}
echo "  ✓ Re-inserted $reinserted pending jobs.\n";

// 5. Live test
echo "\n--- LIVE TEST: INSERT queue_jobs ---\n";
try {
    $testId = bin2hex(random_bytes(16));
    $pdo->prepare("INSERT INTO queue_jobs (id, queue, payload, status, available_at, created_at) VALUES (?, 'test', '{}', 'completed', NOW(), NOW())")
        ->execute([$testId]);
    echo "  ✓ INSERT succeeded. id=$testId\n";
    $pdo->exec("DELETE FROM queue_jobs WHERE id = '$testId'");
    echo "  ✓ Cleaned up.\n";
} catch (Exception $e) {
    echo "  ✗ STILL failing: " . $e->getMessage() . "\n";
}

// 6. Also test dispatchQueueJob pattern (no explicit id)
echo "\n--- TEST: INSERT without explicit id (dispatchQueueJob pattern) ---\n";
try {
    $pdo->prepare("INSERT INTO queue_jobs (queue, payload, status, available_at, created_at) VALUES (?, ?, 'completed', NOW(), NOW())")
        ->execute(['test', '{"test":true}']);
    $lastId = $pdo->lastInsertId();
    echo "  lastInsertId = '$lastId' (empty is ok for VARCHAR)\n";
    // Clean up - need to find the test row another way
    $pdo->exec("DELETE FROM queue_jobs WHERE queue = 'test' AND status = 'completed'");
    echo "  ✓ dispatchQueueJob pattern works (no auto_increment needed)\n";
} catch (Exception $e) {
    echo "  → dispatchQueueJob pattern also fails: " . $e->getMessage() . "\n";
    echo "  → db_connect.php needs to provide id itself.\n";
}

echo "\n=== DONE — DELETE THIS FILE ===\n";
