<?php
// api/campaign_timer.php - Real-time Campaign Sending Timer
// Measures exact time from start to completion for actual email sending

error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);
ini_set('display_errors', 1);
set_time_limit(300);

require_once 'db_connect.php';

$campaignId = $_GET['campaign_id'] ?? null;
$action = $_GET['action'] ?? 'monitor';

// API endpoint for status checks - MUST BE BEFORE ANY HTML OUTPUT
if ($action === 'status' && $campaignId) {
    // Clean any output buffer to prevent PHP warnings/errors from breaking JSON
    if (ob_get_length())
        ob_clean();

    // Suppress any errors that might leak into JSON
    error_reporting(0);
    ini_set('display_errors', 0);

    header('Content-Type: application/json');

    try {
        $stmtStatus = $pdo->prepare("SELECT status, count_sent, total_target_audience, sent_at FROM campaigns WHERE id = ?");
        $stmtStatus->execute([$campaignId]);
        $status = $stmtStatus->fetch(PDO::FETCH_ASSOC);

        if (!$status) {
            echo json_encode(['error' => 'Campaign not found', 'count_sent' => 0, 'total_target_audience' => 0, 'status' => 'unknown']);
        } else {
            echo json_encode($status);
        }
    } catch (Exception $e) {
        echo json_encode(['error' => $e->getMessage(), 'count_sent' => 0, 'total_target_audience' => 0, 'status' => 'error']);
    }
    exit;
}

header('Content-Type: text/html; charset=utf-8');

if (!$campaignId) {
    echo "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Campaign Timer</title></head><body>";
    echo "<h1>❌ Error: Please provide campaign_id</h1>";
    echo "<p>Example: ?campaign_id=YOUR_ID&action=start</p>";
    exit;
}

$stmtCamp = $pdo->prepare("SELECT * FROM campaigns WHERE id = ? LIMIT 1");
$stmtCamp->execute([$campaignId]);
$campaign = $stmtCamp->fetch();

if (!$campaign) {
    echo "Campaign not found";
    exit;
}

?>
<!DOCTYPE html>
<html>

<head>
    <meta charset='utf-8'>
    <title>Campaign Timer -
        <?= htmlspecialchars($campaign['name']) ?>
    </title>
    <style>
        body {
            font-family: 'JetBrains Mono', monospace;
            background: #0f172a;
            color: #94a3b8;
            padding: 20px;
            margin: 0;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 20px;
            border-left: 4px solid #3b82f6;
        }

        h1 {
            color: #f1f5f9;
            margin: 0 0 10px 0;
            font-size: 28px;
        }

        .campaign-info {
            color: #60a5fa;
            font-size: 14px;
            margin-top: 10px;
        }

        .timer-display {
            background: #1e293b;
            padding: 40px;
            border-radius: 12px;
            text-align: center;
            margin: 20px 0;
            border: 2px solid #334155;
        }

        .timer-value {
            font-size: 72px;
            font-weight: bold;
            color: #3b82f6;
            font-variant-numeric: tabular-nums;
        }

        .timer-label {
            color: #64748b;
            font-size: 14px;
            text-transform: uppercase;
            margin-top: 10px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin: 20px 0;
        }

        .stat-card {
            background: #1e293b;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #334155;
            text-align: center;
        }

        .stat-value {
            font-size: 32px;
            font-weight: bold;
            color: #f1f5f9;
            margin-bottom: 5px;
        }

        .stat-label {
            color: #64748b;
            font-size: 12px;
            text-transform: uppercase;
        }

        .progress-container {
            background: #1e293b;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }

        .progress-bar-bg {
            background: #334155;
            height: 30px;
            border-radius: 15px;
            overflow: hidden;
            position: relative;
        }

        .progress-bar-fill {
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            height: 100%;
            transition: width 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
        }

        .btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            text-decoration: none;
            display: inline-block;
            margin: 5px;
        }

        .btn:hover {
            background: #2563eb;
        }

        .btn-success {
            background: #10b981;
        }

        .btn-danger {
            background: #ef4444;
        }

        .status {
            padding: 8px 16px;
            border-radius: 6px;
            display: inline-block;
            font-weight: bold;
            font-size: 12px;
        }

        .status-sending {
            background: #fbbf24;
            color: #000;
        }

        .status-completed {
            background: #10b981;
            color: #fff;
        }

        .status-scheduled {
            background: #3b82f6;
            color: #fff;
        }

        .log-container {
            background: #1e293b;
            padding: 20px;
            border-radius: 8px;
            max-height: 400px;
            overflow-y: auto;
            margin: 20px 0;
        }

        .log-entry {
            padding: 8px;
            border-bottom: 1px solid #334155;
            font-size: 13px;
        }

        .log-time {
            color: #60a5fa;
        }

        .log-success {
            color: #4ade80;
        }

        .log-error {
            color: #f87171;
        }
    </style>
</head>

<body>
    <div class='container'>
        <div class='header'>
            <h1>⏱️ Campaign Sending Timer</h1>
            <div class='campaign-info'>
                <div><strong>Campaign:</strong>
                    <?= htmlspecialchars($campaign['name']) ?>
                </div>
                <div><strong>ID:</strong>
                    <?= $campaignId ?>
                </div>
                <div><strong>Status:</strong> <span class='status status-<?= $campaign['status'] ?>'>
                        <?= strtoupper($campaign['status']) ?>
                    </span></div>
            </div>
        </div>

        <div class='timer-display'>
            <div class='timer-value' id='timerDisplay'>00:00.0</div>
            <div class='timer-label'>Elapsed Time</div>
        </div>

        <div class='stats-grid'>
            <div class='stat-card'>
                <div class='stat-value' id='sentCount'>0</div>
                <div class='stat-label'>Sent</div>
            </div>
            <div class='stat-card'>
                <div class='stat-value' id='targetCount'>
                    <?= $campaign['total_target_audience'] ?? 0 ?>
                </div>
                <div class='stat-label'>Target</div>
            </div>
            <div class='stat-card'>
                <div class='stat-value' id='speedValue'>0</div>
                <div class='stat-label'>emails/s</div>
            </div>
            <div class='stat-card'>
                <div class='stat-value' id='etaValue'>--</div>
                <div class='stat-label'>ETA</div>
            </div>
        </div>

        <div class='progress-container'>
            <div class='progress-bar-bg'>
                <div class='progress-bar-fill' id='progressBar' style='width: 0%'>0%</div>
            </div>
        </div>

        <div style='text-align: center; margin: 20px 0;'>
            <?php if ($campaign['status'] !== 'sending'): ?>
                <button class='btn btn-success' onclick='startCampaign()'>🚀 Start Sending</button>
            <?php else: ?>
                <button class='btn btn-danger' onclick='pauseCampaign()'>⏸️ Pause</button>
            <?php endif; ?>
            <a href='?' class='btn'>🔄 Refresh</a>
        </div>

        <div class='log-container' id='logContainer'>
            <div class='log-entry'><span class='log-time'>[Ready]</span> Waiting to start...</div>
        </div>
    </div>

    <script>
        let startTime = null;
        let timerInterval = null;
        let monitorInterval = null;

        function addLog(message, type = 'info') {
            const logContainer = document.getElementById('logContainer');
            const time = new Date().toLocaleTimeString('en-GB');
            const className = type === 'success' ? 'log-success' : (type === 'error' ? 'log-error' : '');
            logContainer.innerHTML = `<div class='log-entry'><span class='log-time'>[${time}]</span> <span class='${className}'>${message}</span></div>` + logContainer.innerHTML;
        }

        function formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = (seconds % 60).toFixed(1);
            return `${String(mins).padStart(2, '0')}:${String(secs).padStart(4, '0')}`;
        }

        function startCampaign() {
            addLog('🚀 Triggering campaign worker...', 'info');

            // Trigger the worker
            fetch('worker_campaign.php?campaign_id=<?= $campaignId ?>')
                .then(response => response.json())
                .then(data => {
                    addLog('✅ Worker triggered successfully', 'success');
                    startTime = Date.now();
                    startTimer();
                    startMonitoring();
                })
                .catch(error => {
                    addLog('❌ Error: ' + error.message, 'error');
                });
        }

        function startTimer() {
            if (timerInterval) clearInterval(timerInterval);

            timerInterval = setInterval(() => {
                if (!startTime) return;

                const elapsed = (Date.now() - startTime) / 1000;
                document.getElementById('timerDisplay').textContent = formatTime(elapsed);
            }, 100);
        }

        function startMonitoring() {
            if (monitorInterval) clearInterval(monitorInterval);

            monitorInterval = setInterval(() => {
                fetch('campaign_timer.php?campaign_id=<?= $campaignId ?>&action=status')
                    .then(response => response.json())
                    .then(data => {
                        const sent = data.count_sent || 0;
                        const target = data.total_target_audience || 1;
                        const progress = (sent / target) * 100;
                        const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
                        const speed = elapsed > 0 ? (sent / elapsed).toFixed(1) : 0;

                        document.getElementById('sentCount').textContent = sent;
                        document.getElementById('targetCount').textContent = target;
                        document.getElementById('speedValue').textContent = speed;
                        document.getElementById('progressBar').style.width = progress + '%';
                        document.getElementById('progressBar').textContent = Math.round(progress) + '%';

                        if (speed > 0 && sent < target) {
                            const remaining = target - sent;
                            const eta = remaining / speed;
                            document.getElementById('etaValue').textContent = Math.round(eta) + 's';
                        } else if (sent >= target) {
                            document.getElementById('etaValue').textContent = '0s';
                        }

                        // Check if completed
                        if (data.status === 'completed' || sent >= target) {
                            clearInterval(monitorInterval);
                            clearInterval(timerInterval);
                            addLog(`✅ Campaign completed! Total time: ${formatTime(elapsed)}`, 'success');
                            addLog(`📊 Final stats: ${sent} emails sent at ${speed} emails/s`, 'success');
                        }
                    })
                    .catch(error => {
                        console.error('Monitoring error:', error);
                    });
            }, 500); // Check every 500ms
        }

        // Auto-start monitoring if campaign is already sending
        <?php if ($campaign['status'] === 'sending'): ?>
            startTime = Date.now() - (<?= time() - strtotime($campaign['sent_at'] ?? 'now') ?> * 1000);
            startTimer();
            startMonitoring();
            addLog('📊 Monitoring active campaign...', 'info');
        <?php endif; ?>
    </script>
</body>

</html>