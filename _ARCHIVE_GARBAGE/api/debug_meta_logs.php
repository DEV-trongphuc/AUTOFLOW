<?php
/**
 * Debug Log Viewer for Meta Webhook
 * Accessible at: /api/debug_meta_logs.php
 */

header('Content-Type: text/html; charset=utf-8');
$logFile = __DIR__ . '/meta_webhook_prod.log';
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meta Webhook Logs</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <meta http-equiv="refresh" content="5"> <!-- Auto refresh every 5s -->
</head>

<body class="bg-gray-100 p-8">
    <div class="max-w-6xl mx-auto">
        <div class="flex justify-between items-center mb-6">
            <div>
                <h1 class="text-2xl font-bold text-gray-800">Meta Webhook Live Logs</h1>
                <p class="text-xs text-gray-500 font-mono mt-1">File: <?php echo htmlspecialchars($logFile); ?></p>
            </div>
            <div class="space-x-4">
                <a href="test_logging.php"
                    class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 font-bold"
                    target="_blank">Test Write</a>
                <a href="?clear=1" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-bold"
                    onclick="return confirm('Clear all logs?')">Clear Logs</a>
                <a href="debug_meta_logs.php"
                    class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-bold">Refresh</a>
            </div>
        </div>

        <?php
        if (isset($_GET['clear'])) {
            file_put_contents($logFile, ''); // Clear file
            echo '<div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">Logs cleared! Redirecting...<script>setTimeout(()=>window.location="debug_meta_logs.php", 1000)</script></div>';
        }

        if (!file_exists($logFile)) {
            echo '<div class="bg-white p-6 rounded shadow text-center text-gray-500">Log file not found yet. Waiting for webhook activity...</div>';
        } else {
            $content = file_get_contents($logFile);
            if (empty(trim($content))) {
                echo '<div class="bg-white p-6 rounded shadow text-center text-gray-500">Log file is empty. Waiting for webhook activity...</div>';
            } else {
                // Parse logs - assuming format "[Y-m-d H:i:s] Array (...)"
                // We'll just display raw for now but styled
                $lines = explode("\n", $content);
                $lines = array_reverse($lines); // Newest first
        
                echo '<div class="bg-slate-900 text-slate-200 p-6 rounded-xl shadow-lg font-mono text-sm overflow-x-auto whitespace-pre-wrap">';
                foreach ($lines as $line) {
                    if (trim($line)) {
                        echo htmlspecialchars($line) . "\n\n";
                        echo "<hr class='border-slate-700 my-2'>";
                    }
                }
                echo '</div>';
            }
        }
        ?>
    </div>
</body>

</html>