<?php
/**
 * Log Viewer for Debugging AI and Webhooks
 * Put this in the 'api' directory and access via browser.
 */

// Basic security - you can add token logic here if needed
header('Content-Type: text/html; charset=utf-8');

$logs = [
    'Webhooks (meta_webhook_prod.log)' => __DIR__ . '/meta_webhook_prod.log',
    'AI Debugging (meta_debug.log)' => __DIR__ . '/meta_debug.log',
    'AI Worker (worker_debug.log)' => __DIR__ . '/worker_debug.log',
    'Zalo Debug (zalo_debug_ai.log)' => __DIR__ . '/zalo_debug_ai.log'
];

$linesToRead = isset($_GET['lines']) ? (int)$_GET['lines'] : 100;
if ($linesToRead <= 0) $linesToRead = 100;

function tailCustom($filepath, $lines = 100) {
    if (!file_exists($filepath)) return "File không tồn tại: $filepath";
    
    $f = @fopen($filepath, "rb");
    if ($f === false) return "Không thể mở file: $filepath";

    fseek($f, -1, SEEK_END);
    $data = '';
    $lineCount = 0;
    
    while (ftell($f) > 0) {
        $char = fgetc($f);
        if ($char === "\n") {
            $lineCount++;
            if ($lineCount >= $lines) {
                break;
            }
        }
        $data = $char . $data;
        fseek($f, -2, SEEK_CUR);
    }
    fclose($f);
    return trim($data) !== '' ? htmlspecialchars(trim($data)) : "(Log rỗng)";
}

echo "<!DOCTYPE html><html><head><title>System Logs Viewer</title>";
echo "<style>
    body { font-family: -apple-system, system-ui, sans-serif; background: #111; color: #eee; padding: 20px; }
    h2 { color: #4CAF50; border-bottom: 1px solid #333; padding-bottom: 10px; }
    .log-box { background: #222; border: 1px solid #444; border-radius: 6px; padding: 15px; margin-bottom: 30px; font-family: monospace; font-size: 13px; line-height: 1.5; overflow-y: auto; max-height: 500px; white-space: pre-wrap; }
    .controls { margin-bottom: 20px; }
    button, select, input { padding: 8px 12px; background: #333; border: 1px solid #555; color: #fff; border-radius: 4px; cursor: pointer; }
    button:hover { background: #444; }
</style>";
echo "</head><body>";

echo "<h1>System Logs Viewer</h1>";
echo "<div class='controls'>";
echo "<form method='GET'>";
echo "Hiển thị <input type='number' name='lines' value='$linesToRead' style='width: 60px;'> dòng cuối. ";
echo "<button type='submit'>Refresh Logs</button> ";
echo "<a href='?'><button type='button'>Về Mặc Định (100 dòng)</button></a>";
echo "</form>";
echo "</div>";

foreach ($logs as $title => $path) {
    echo "<h2>📌 $title</h2>";
    echo "<div class='log-box' id='log-" . md5($title) . "'>";
    echo tailCustom($path, $linesToRead);
    echo "</div>";
}

// Auto-scroll logic
echo "<script>
    document.querySelectorAll('.log-box').forEach(box => {
        box.scrollTop = box.scrollHeight;
    });
</script>";

echo "</body></html>";
?>
