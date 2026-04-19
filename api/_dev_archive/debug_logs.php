<?php
// debug_logs.php — View meta + zalo logs (last N lines)
$n = (int)($_GET['n'] ?? 60);
$n = max(10, min($n, 300));

$logs = [
    'META Webhook' => __DIR__ . '/meta_webhook_prod.log',
    'ZALO Debug'   => __DIR__ . '/zalo_debug.log',
];

header('Content-Type: text/html; charset=utf-8');
echo "<!DOCTYPE html><html><head><meta charset='utf-8'><meta http-equiv='refresh' content='10'>
<style>
body{font-family:monospace;background:#0f172a;color:#cbd5e1;padding:16px;font-size:12px;margin:0}
h2{color:#f59e0b;margin:16px 0 6px;border-bottom:1px solid #334155;padding-bottom:4px}
.log{background:#0d1b2a;border:1px solid #1e3a5f;border-radius:6px;padding:12px;max-height:420px;overflow-y:auto;white-space:pre-wrap;word-break:break-all}
.line{display:block;padding:1px 0}
.trace{color:#60a5fa}
.ok{color:#34d399}
.bad{color:#f87171}
.warn{color:#fbbf24}
.dim{color:#475569}
.ctrl{margin-bottom:10px}
a{color:#60a5fa;text-decoration:none;margin-right:8px}
</style></head><body>
<div class='ctrl'>
  <b style='color:#e2e8f0'>📄 Log Viewer</b> — Auto-refresh 10s &nbsp;|&nbsp;
  <a href='?n=30'>30 dòng</a>
  <a href='?n=60'>60 dòng</a>
  <a href='?n=150'>150 dòng</a>
  <a href='?n=300'>300 dòng</a>
  &nbsp;| Hiện tại: $n dòng | " . date('H:i:s') . "
</div>";

foreach ($logs as $title => $path) {
    echo "<h2>$title — " . basename($path) . "</h2>";
    if (!file_exists($path)) {
        echo "<div class='log'><span class='bad'>File không tồn tại: $path</span></div>";
        continue;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES);
    $tail  = array_slice($lines, -$n);
    echo "<div class='log'>";
    foreach ($tail as $line) {
        $safe = htmlspecialchars($line);
        if (strpos($line, '[TRACE] ✅') !== false || strpos($line, 'DEBUG SIG] ✅') !== false)
            echo "<span class='line ok'>$safe</span>";
        elseif (strpos($line, '[TRACE] ❌') !== false || strpos($line, 'MISMATCH') !== false || strpos($line, 'ERROR') !== false)
            echo "<span class='line bad'>$safe</span>";
        elseif (strpos($line, '[TRACE] ⛔') !== false || strpos($line, 'PAUSED') !== false || strpos($line, 'Human') !== false)
            echo "<span class='line warn'>$safe</span>";
        elseif (strpos($line, '[TRACE]') !== false || strpos($line, '[DEBUG') !== false)
            echo "<span class='line trace'>$safe</span>";
        elseif (strpos($line, 'GET') !== false && strpos($line, 'Payload: EMPTY') !== false)
            echo "<span class='line dim'>$safe</span>";
        else
            echo "<span class='line'>$safe</span>";
    }
    echo "</div>";
}
echo "</body></html>";
