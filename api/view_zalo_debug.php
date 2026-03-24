<?php
/**
 * view_zalo_debug.php
 * Displays the recent Zalo logs with highlighting for Human Takeover events.
 */
header('Content-Type: text/html; charset=utf-8');

$logFiles = [
    __DIR__ . '/zalo_debug.log',
    __DIR__ . '/zalo_webhook.log',
    __DIR__ . '/debug_zalo.log',
    __DIR__ . '/webhook_debug.log'
];

$logFile = null;
foreach ($logFiles as $file) {
    if (file_exists($file)) {
        $logFile = $file;
        break;
    }
}

if (!$logFile) {
    // Try checking if it's logging to a different file based on webhook.php
    $logFile = __DIR__ . '/zalo_webhook.log';
    if (!file_exists($logFile)) {
        die("No Zalo log file found. Please send a message from Zalo to generate logs.");
    }
}

$content = file_get_contents($logFile);
$lines = explode("\n", $content);
$lastLines = array_slice($lines, -200); // Get last 200 lines
$output = implode("\n", $lastLines);

// Highlighting
$output = htmlspecialchars($output);
$output = str_replace("Sự kiện Zalo oa_send_text", "<b style='color: #2ecc71;'>--- [!!!] ZALO HUMAN REPLY DETECTED [!!!] ---</b>", $output);
$output = str_replace("Human Zalo Reply Detected", "<b style='color: #2ecc71;'>--- [!!!] HUMAN TAKE-OVER SUCCESSFUL [!!!] ---</b>", $output);
$output = str_replace("Tư vấn viên trả lời", "<b style='color: #2ecc71;'>--- STAFF REPLY DETECTED ---</b>", $output);
$output = str_replace("30 MINUTE", "<b style='color: #e74c3c;'>>>> PAUSING ZALO AI (30 MINS) <<<</b>", $output);
$output = str_replace("[Automation]", "<span style='color: #3498db;'>[AI AUTOMATION MESSAGE]</span>", $output);

?>
<!DOCTYPE html>
<html>

<head>
    <title>Zalo Webhook Debugger</title>
    <meta http-equiv="refresh" content="5">
    <style>
        body {
            background: #1e1e1e;
            color: #d4d4d4;
            font-family: monospace;
            padding: 20px;
            line-height: 1.5;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: #252526;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
        }

        h1 {
            color: #569cd6;
            border-bottom: 1px solid #3e3e42;
            padding-bottom: 10px;
        }

        pre {
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 13px;
        }

        .meta {
            color: #858585;
            margin-bottom: 10px;
            font-size: 12px;
        }
    </style>
</head>

<body>
    <div class="container">
        <h1>Zalo Webhook Debug Logs</h1>
        <div class="meta">
            File:
            <?php echo basename($logFile); ?> |
            Current Time:
            <?php echo date('Y-m-d H:i:s'); ?> |
            Size:
            <?php echo filesize($logFile); ?> bytes
        </div>
        <hr>
        <pre><?php echo $output; ?></pre>
        <hr>
        <div style="text-align: center; color: #858585; font-size: 12px;">Auto-refreshing every 5 seconds...</div>
    </div>
</body>

</html>