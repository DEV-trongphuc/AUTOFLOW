<?php
require_once 'db_connect.php';

echo "--- Queue Rescue Starting ---\n";

// 1. Reset zombie 'processing' jobs to 'pending'
// Jobs that have been in processing for more than 10 minutes are likely dead
$stmt = $pdo->prepare("UPDATE queue_jobs SET status = 'pending', reserved_at = NULL WHERE status = 'processing' AND reserved_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE)");
$stmt->execute();
$resetCount = $stmt->rowCount();
echo "Reset $resetCount zombie jobs to pending.\n";

// 2. Clear very old failed jobs (optional, depends on policy)
// Let's just focus on getting the queue moving.

// 3. Trigger the worker again
echo "Triggering worker queue...\n";
triggerAsyncWorker();

echo "Rescue complete.\n";
