<?php
$f = 'api/worker_flow.php';
$c = file_get_contents($f);
$c = str_replace(
    '// Detect priority runs',
    "// [ZOMBIE REAPER] Rescue stuck processes\n        try { \$pdo->exec(\"UPDATE flow_subscribers SET status = 'queued' WHERE status = 'processing' AND updated_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)\"); } catch (Exception \$e) {}\n\n        // Detect priority runs",
    $c
);
file_put_contents($f, $c);
echo "Patched worker_flow.php\n";
