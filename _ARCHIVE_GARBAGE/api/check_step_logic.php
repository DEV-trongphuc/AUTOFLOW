<?php
// =============================================================================
// check_step_logic.php — SIMULATE & AUDIT STEP EXECUTION LOGIC
// Giả lập chính xác logic worker_flow + FlowExecutor để tìm tại sao step sai
// Usage: /api/check_step_logic.php?flow_id=69dca73f0d951&sub=SUBSCRIBER_ID
// =============================================================================

error_reporting(E_ALL);
ini_set('display_errors', 1);
date_default_timezone_set('Asia/Ho_Chi_Minh');

require_once __DIR__ . '/db_connect.php';
$pdo->exec("SET NAMES utf8mb4");
header('Content-Type: text/html; charset=utf-8');

$flowId = $_GET['flow_id'] ?? '69dca73f0d951';
$subId = $_GET['sub'] ?? null;
$fix = isset($_GET['fix']) && $_GET['fix'] === '1';
?><!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Step Logic Checker</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font: 13px 'Segoe UI', monospace;
            background: #0d1117;
            color: #e4e4e7;
            padding: 16px;
        }

        h1 {
            color: #a78bfa;
            font-size: 18px;
            margin-bottom: 4px;
        }

        h2 {
            color: #60a5fa;
            font-size: 14px;
            margin: 18px 0 6px;
            border-left: 3px solid #60a5fa;
            padding-left: 8px;
        }

        h3 {
            color: #94a3b8;
            font-size: 12px;
            margin: 12px 0 4px;
        }

        .meta {
            color: #6b7280;
            font-size: 11px;
            margin-bottom: 16px;
        }

        .card {
            background: #161b22;
            border: 1px solid #21262d;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 10px;
        }

        .ok {
            color: #3fb950;
        }

        .warn {
            color: #d29922;
        }

        .err {
            color: #f85149;
        }

        .info {
            color: #79c0ff;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }

        th {
            background: #21262d;
            color: #8b949e;
            padding: 5px 8px;
            text-align: left;
        }

        td {
            padding: 4px 8px;
            border-bottom: 1px solid #161b22;
            vertical-align: top;
        }

        tr:hover td {
            background: #1c2128;
        }

        .badge {
            display: inline-block;
            padding: 1px 7px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 600;
        }

        .b-wait {
            background: #1f3656;
            color: #79c0ff;
        }

        .b-action {
            background: #1a3a2a;
            color: #3fb950;
        }

        .b-cond {
            background: #3d2e00;
            color: #d29922;
        }

        .b-trig {
            background: #2d1b4e;
            color: #d2a8ff;
        }

        .b-waiting {
            background: #1f3656;
            color: #79c0ff;
        }

        .b-processing {
            background: #3d2e00;
            color: #d29922;
        }

        .b-completed {
            background: #1a3a2a;
            color: #3fb950;
        }

        .b-failed {
            background: #3d1515;
            color: #f85149;
        }

        .alert {
            padding: 8px 12px;
            border-radius: 6px;
            margin: 8px 0;
            line-height: 1.6;
            font-size: 12px;
        }

        .alert-ok {
            background: #1a3a2a;
            border-left: 3px solid #3fb950;
        }

        .alert-warn {
            background: #2d2008;
            border-left: 3px solid #d29922;
        }

        .alert-err {
            background: #2d0f0f;
            border-left: 3px solid #f85149;
        }

        .alert-info {
            background: #1f3656;
            border-left: 3px solid #79c0ff;
        }

        code {
            background: #21262d;
            padding: 1px 5px;
            border-radius: 3px;
            font-size: 11px;
        }

        pre {
            background: #0d1117;
            border: 1px solid #21262d;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
            font-size: 11px;
            color: #e4e4e7;
        }

        .step-box {
            border: 1px solid #21262d;
            border-radius: 6px;
            padding: 10px;
            margin: 6px 0;
        }

        .step-wait {
            border-color: #1f3656;
        }

        .step-action {
            border-color: #1a3a2a;
        }

        .step-cond {
            border-color: #3d2e00;
        }

        .sim-row {
            display: flex;
            gap: 10px;
            margin: 4px 0;
        }

        .sim-label {
            color: #8b949e;
            min-width: 140px;
            flex-shrink: 0;
        }

        .sim-val {
            flex: 1;
        }

        a {
            color: #79c0ff;
        }

        .fix-btn {
            background: #388bfd;
            color: #fff;
            border: none;
            padding: 4px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            text-decoration: none;
            display: inline-block;
            margin: 4px 0;
        }

        .fix-btn-red {
            background: #f85149;
        }
    </style>
</head>

<body>
    <?php

    $now = date('Y-m-d H:i:s');
    echo "<h1>🔬 Step Logic Checker</h1>";
    echo "<div class='meta'>Flow: <b>$flowId</b> | Now: $now | <a href='?flow_id=$flowId'>Reset</a></div>";

    // ─── LOAD FLOW ─────────────────────────────────────────────────────
    $flow = $pdo->prepare("SELECT id, name, steps, config FROM flows WHERE id = ?");
    $flow->execute([$flowId]);
    $flowRow = $flow->fetch(PDO::FETCH_ASSOC);
    if (!$flowRow) {
        echo "<div class='alert alert-err'>❌ Flow not found</div>";
        exit;
    }

    $flowSteps = json_decode($flowRow['steps'], true) ?? [];
    $stepMap = [];
    foreach ($flowSteps as $s)
        $stepMap[$s['id']] = $s;

    // Build ordered step chain from trigger
    $triggerStep = null;
    foreach ($flowSteps as $s) {
        if ($s['type'] === 'trigger') {
            $triggerStep = $s;
            break;
        }
    }

    function buildChain($stepMap, $startId, $max = 30)
    {
        $chain = [];
        $visited = [];
        $queue = [$startId];
        while (!empty($queue) && count($chain) < $max) {
            $id = array_shift($queue);
            if (!$id || isset($visited[$id]) || !isset($stepMap[$id]))
                continue;
            $visited[$id] = true;
            $s = $stepMap[$id];
            $chain[] = $s;
            foreach (['nextStepId', 'yesStepId', 'noStepId'] as $k) {
                if (!empty($s[$k]))
                    $queue[] = $s[$k];
            }
            if (!empty($s['config']['branches'])) {
                foreach ($s['config']['branches'] as $b) {
                    if (!empty($b['stepId']))
                        $queue[] = $b['stepId'];
                }
            }
        }
        return $chain;
    }

    $chain = [];
    if ($triggerStep && !empty($triggerStep['nextStepId'])) {
        $chain = buildChain($stepMap, $triggerStep['nextStepId']);
    }

    // ─── SECTION 1: FLOW STRUCTURE ─────────────────────────────────────
    echo "<h2>📋 Flow Structure: " . htmlspecialchars($flowRow['name']) . "</h2>";
    echo "<div class='card'>";
    foreach ($chain as $i => $s) {
        $type = $s['type'];
        $boxClass = $type === 'wait' ? 'step-wait' : ($type === 'action' ? 'step-action' : 'step-cond');
        $badgeClass = $type === 'wait' ? 'b-wait' : ($type === 'action' ? 'b-action' : 'b-cond');
        $cfg = $s['config'] ?? [];
        $detail = '';

        if ($type === 'wait') {
            $mode = $cfg['mode'] ?? 'duration';
            if ($mode === 'duration') {
                $detail = "⏱ {$cfg['duration']} {$cfg['unit']}";
            } elseif ($mode === 'until_date') {
                $detail = "📅 Đến {$cfg['specificDate']} {$cfg['untilTime']}";
            } elseif ($mode === 'until') {
                $detail = "🕐 Đến {$cfg['untilTime']} " . ($cfg['untilDay'] ?? 'mỗi ngày');
            } elseif ($mode === 'until_attribute') {
                $detail = "🎂 Attribute: {$cfg['attributeKey']}";
            }
            $isInstant = false;
        } elseif ($type === 'action') {
            $detail = "📧 " . ($cfg['subject'] ?? 'Email action');
            $isInstant = true;
        } else {
            $detail = $type;
            $isInstant = true;
        }

        $next = isset($s['nextStepId']) ? " → " . substr($s['nextStepId'], 0, 8) . "..." : " → END";
        echo "<div class='step-box $boxClass'>
      <span class='badge $badgeClass'>#{$i} " . strtoupper($type) . "</span>
      <b style='margin-left:8px'>{$s['label']}</b>
      <span class='info' style='margin-left:8px; font-size:11px'>$detail</span>
      <span class='meta' style='margin-left:8px'>$next</span>
      " . ($isInstant ? "<span class='ok' style='margin-left:8px; font-size:10px'>⚡ instant</span>" : "<span class='warn' style='margin-left:8px; font-size:10px'>⏸ blocks chain</span>") . "
      <span class='meta' style='float:right'>ID: " . substr($s['id'], 0, 12) . "...</span>
    </div>";
    }
    echo "</div>";

    // ─── SECTION 2: PICK SUBSCRIBER ────────────────────────────────────
    echo "<h2>👤 Chọn Subscriber Để Trace</h2>";

    if (!$subId) {
        // Show problematic subscribers to pick from
        $candidates = [];

        // Anomaly: >1 email in flow
        $stmt = $pdo->prepare("
        SELECT sa.subscriber_id, s.email, COUNT(*) as cnt,
               TIMESTAMPDIFF(SECOND, MIN(sa.created_at), MAX(sa.created_at)) as span_sec,
               GROUP_CONCAT(sa.type ORDER BY sa.created_at) as types
        FROM subscriber_activity sa
        JOIN subscribers s ON sa.subscriber_id = s.id
        WHERE sa.flow_id = ?
        AND sa.type IN ('receive_email','zalo_sent','zns_sent','meta_sent')
        GROUP BY sa.subscriber_id
        HAVING cnt > 1
        ORDER BY cnt DESC, span_sec ASC
        LIMIT 10
    ");
        $stmt->execute([$flowId]);
        $anomalies = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Wait reset victims
        $stmt2 = $pdo->prepare("
        SELECT subscriber_id, COUNT(*) as wait_cnt, MIN(created_at) as first
        FROM subscriber_activity
        WHERE flow_id = ? AND type = 'wait_processed'
        GROUP BY subscriber_id, reference_id
        HAVING wait_cnt > 1
        ORDER BY first DESC
        LIMIT 10
    ");
        $stmt2->execute([$flowId]);
        $waitVictims = $stmt2->fetchAll(PDO::FETCH_ASSOC);

        echo "<div class='card'>";
        echo "<div class='alert alert-info'>ℹ️ Chưa chọn subscriber. Click vào subscriber bên dưới để trace.</div>";

        if (!empty($anomalies)) {
            echo "<h3>🚨 Subscriber Gửi Nhiều Lần (Anomalous)</h3>";
            echo "<table><tr><th>Email</th><th>Lần gửi</th><th>Span</th><th>Types</th><th></th></tr>";
            foreach ($anomalies as $r) {
                echo "<tr>
              <td>{$r['email']}</td>
              <td><span class='err'><b>{$r['cnt']}</b></span></td>
              <td>{$r['span_sec']}s</td>
              <td><code>{$r['types']}</code></td>
              <td><a href='?flow_id=$flowId&sub={$r['subscriber_id']}'>🔎 Trace</a></td>
            </tr>";
            }
            echo "</table>";
        }

        if (!empty($waitVictims)) {
            echo "<h3 style='margin-top:12px'>⏰ Subscriber Wait Bị Reset</h3>";
            echo "<table><tr><th>Subscriber ID</th><th>Wait Processed</th><th>First Time</th><th></th></tr>";
            foreach ($waitVictims as $r) {
                echo "<tr>
              <td>" . substr($r['subscriber_id'], 0, 24) . "</td>
              <td><span class='err'>{$r['wait_cnt']}</span></td>
              <td>{$r['first']}</td>
              <td><a href='?flow_id=$flowId&sub={$r['subscriber_id']}'>🔎 Trace</a></td>
            </tr>";
            }
            echo "</table>";
        }
        echo "</div>";
        echo "</body></html>";
        exit;
    }

    // ─── LOAD SUBSCRIBER STATE ─────────────────────────────────────────
    $stateStmt = $pdo->prepare("
    SELECT sfs.*, s.email, s.first_name, s.last_name, s.status as sub_status
    FROM subscriber_flow_states sfs
    JOIN subscribers s ON sfs.subscriber_id = s.id
    WHERE sfs.flow_id = ? AND sfs.subscriber_id = ?
    ORDER BY sfs.created_at DESC LIMIT 1
");
    $stateStmt->execute([$flowId, $subId]);
    $state = $stateStmt->fetch(PDO::FETCH_ASSOC);

    if (!$state) {
        echo "<div class='alert alert-err'>❌ Subscriber <code>$subId</code> không có trong flow này.</div>";
        exit;
    }

    echo "<h2>👤 Subscriber: {$state['email']}</h2>";
    echo "<div class='card'>";
    echo "<div style='display:grid; grid-template-columns:1fr 1fr; gap: 8px'>";

    $fields = [
        'id' => 'Queue ID',
        'subscriber_id' => 'Sub ID',
        'status' => 'Status',
        'step_id' => 'Step ID în DB',
        'scheduled_at' => 'scheduled_at',
        'updated_at' => 'updated_at',
        'created_at' => 'created_at',
        'last_step_at' => 'last_step_at',
        'last_error' => 'last_error'
    ];
    foreach ($fields as $k => $label) {
        $val = $state[$k] ?? 'NULL';
        $display = $val;
        if ($k === 'status') {
            $display = "<span class='badge b-{$val}'>{$val}</span>";
        } elseif ($k === 'step_id') {
            $stepLabel = ($stepMap[$val]['label'] ?? '<span class="err">❌ NOT IN FLOW</span>');
            $display = "<code>" . htmlspecialchars(substr($val ?? '', 0, 20)) . "...</code> → <b>$stepLabel</b>";
        } elseif ($k === 'scheduled_at') {
            $val_ts = strtotime($val);
            $isPast = ($val_ts !== false && $val_ts <= time());
            $diff = $val_ts !== false ? round(($val_ts - time()) / 3600, 1) : 0;
            $cls = $isPast ? 'ok' : 'warn';
            $label_extra = $val_ts === false ? '(INVALID)' : ($isPast ? '(ĐÃ QUA)' : "(còn {$diff}h)");
            $display = "<span class='$cls'>$val $label_extra</span>";
        } elseif ($k === 'last_error' && $val && $val !== 'NULL') {
            $display = "<span class='err'>" . htmlspecialchars($val) . "</span>";
        }
        echo "<div><span class='meta'>$label:</span> $display</div>";
    }
    echo "</div></div>";

    // ─── SECTION 3: SIMULATE is_resumed_wait LOGIC ─────────────────────
    echo "<h2>🧪 Simulate: is_resumed_wait Calculation</h2>";
    echo "<div class='card'>";

    $schedAt = $state['scheduled_at'];
    $currentStepId = $state['step_id'];
    $currentStepInfo = $stepMap[$currentStepId] ?? null;
    $simNow = $now;

    // Simulate as if this is stepsProcessedInRun === 1 (first pickup by cron)
    $stepIdMatches = (trim($currentStepId ?? '') === trim($currentStepId ?? ''));
    $scheduledPassed = ($schedAt <= $simNow);
    $is_resumed_wait = $scheduledPassed; // stepsProcessedInRun=1 always matches for first pickup
    
    echo "<div class='sim-row'><span class='sim-label'>DB scheduled_at:</span><span class='sim-val'>" .
        ($scheduledPassed ? "<span class='ok'>$schedAt ✓ ĐÃ QUA</span>" : "<span class='warn'>$schedAt ⏳ CHƯA ĐẾN</span>") .
        "</span></div>";
    echo "<div class='sim-row'><span class='sim-label'>simNow:</span><span class='sim-val'>$simNow</span></div>";
    echo "<div class='sim-row'><span class='sim-label'>is_resumed_wait:</span><span class='sim-val'>" .
        ($is_resumed_wait ? "<span class='ok'><b>TRUE</b> → Wait sẽ được đánh dấu HOÀN THÀNH ngay</span>" : "<span class='warn'><b>FALSE</b> → Wait sẽ được TÍNH LẠI từ \$scheduleNow</span>") .
        "</span></div>";

    // Simulate wait calculation if not resumed
    if ($currentStepInfo && $currentStepInfo['type'] === 'wait') {
        $cfg = $currentStepInfo['config'] ?? [];
        $mode = trim($cfg['mode'] ?? 'duration');

        echo "<div class='sim-row'><span class='sim-label'>Wait mode:</span><span class='sim-val'><b>$mode</b></span></div>";

        if (!$is_resumed_wait) {
            echo "<h3 style='margin-top:10px'>Nếu worker chạy ngay bây giờ — Wait sẽ được tính:</h3>";

            if ($mode === 'until_date') {
                $specDate = $cfg['specificDate'] ?? '';
                $targetTime = $cfg['untilTime'] ?? '09:00';
                $targetTs = strtotime("$specDate $targetTime:00");
                $calculated = date('Y-m-d H:i:s', $targetTs);
                $isOver = ($targetTs <= time());
                echo "<div class='alert " . ($isOver ? 'alert-err' : 'alert-ok') . "'>
                Until Date: <b>$specDate $targetTime</b> → timestamp=$targetTs → " .
                    ($isOver ? "<span class='err'>❌ Đã QUA → isWaitOver=TRUE → SKIP!</span>" :
                        "<span class='ok'>✅ Chưa đến → scheduled_at = $calculated</span>") .
                    "</div>";
            } elseif ($mode === 'until') {
                $targetTime = $cfg['untilTime'] ?? '09:00';
                $targetDay = $cfg['untilDay'] ?? null;
                $dt = new DateTime($simNow);
                $parts = explode(':', $targetTime);
                $dt->setTime((int) $parts[0], (int) ($parts[1] ?? 0), 0);
                if ($targetDay !== null && $targetDay !== '') {
                    $currentDay = (int) date('w', strtotime($simNow));
                    $daysToWait = ((int) $targetDay - $currentDay + 7) % 7;
                    if ($daysToWait === 0 && $dt->getTimestamp() <= time())
                        $daysToWait = 7;
                    if ($daysToWait > 0)
                        $dt->modify("+$daysToWait days");
                } else {
                    if ($dt->getTimestamp() <= time())
                        $dt->modify("+1 day");
                }
                $calculated = $dt->format('Y-m-d H:i:s');
                echo "<div class='alert alert-ok'>Until Time: <b>$targetTime</b> → scheduled_at = <b>$calculated</b></div>";
            } elseif ($mode === 'duration') {
                $dur = (int) ($cfg['duration'] ?? 1);
                $unit = $cfg['unit'] ?? 'hours';
                $dt = new DateTime($simNow);
                $dt->modify("+$dur $unit");
                $calculated = $dt->format('Y-m-d H:i:s');
                echo "<div class='alert alert-ok'>Duration: <b>$dur $unit</b> → scheduled_at = <b>$calculated</b></div>";
            } elseif ($mode === 'until_attribute') {
                echo "<div class='alert alert-info'>Until Attribute — depends on subscriber field value.</div>";
            }
        } else {
            echo "<div class='alert alert-warn'>⚠️ is_resumed_wait=TRUE → Không cần tính — wait được đánh dấu DONE ngay. Flow sẽ tiến sang bước tiếp theo.</div>";
        }
    }
    echo "</div>";

    // ─── SECTION 4: FULL ACTIVITY LOG ──────────────────────────────────
    echo "<h2>📜 Full Activity Log trong Flow</h2>";
    $actStmt = $pdo->prepare("
    SELECT sa.id, sa.type, sa.reference_id, sa.details, sa.created_at,
           sa.campaign_id, sa.flow_id
    FROM subscriber_activity sa
    WHERE sa.subscriber_id = ? AND sa.flow_id = ?
    ORDER BY sa.created_at ASC
");
    $actStmt->execute([$subId, $flowId]);
    $actLog = $actStmt->fetchAll(PDO::FETCH_ASSOC);

    // Also get any email activity that might reference campaign_id
    $emailStmt = $pdo->prepare("
    SELECT sa.id, sa.type, sa.reference_id, sa.details, sa.created_at, sa.campaign_id
    FROM subscriber_activity sa
    WHERE sa.subscriber_id = ?
    AND sa.type IN ('receive_email','failed_email','zalo_sent','meta_sent','zns_sent')
    AND sa.flow_id IS NULL
    ORDER BY sa.created_at ASC
    LIMIT 20
");
    $emailStmt->execute([$subId]);
    $emailOnlyLog = $emailStmt->fetchAll(PDO::FETCH_ASSOC);

    echo "<div class='card'>";
    if (empty($actLog)) {
        echo "<div class='alert alert-warn'>⚠️ Không có activity log với flow_id này.</div>";
    } else {
        $prevTime = null;
        echo "<table><tr><th>#</th><th>Type</th><th>Step</th><th>Step Label</th><th>Details</th><th>Time</th><th>Gap</th></tr>";
        foreach ($actLog as $i => $act) {
            $stepLabel = ($stepMap[$act['reference_id']]['label'] ?? '<span class=\'err\'>? KHÔNG TÌM THẤY</span>');
            $typeClass = in_array($act['type'], ['receive_email', 'zalo_sent', 'zns_sent']) ? 'ok' :
                ($act['type'] === 'wait_processed' ? 'warn' :
                    ($act['type'] === 'failed_email' ? 'err' : 'info'));
            $gap = '';
            if ($prevTime) {
                $diff = strtotime($act['created_at']) - strtotime($prevTime);
                if ($diff < 60)
                    $gap = "<span class='err'>{$diff}s</span>";
                elseif ($diff < 3600)
                    $gap = "<span class='warn'>" . round($diff / 60, 1) . "m</span>";
                else
                    $gap = "<span class='info'>" . round($diff / 3600, 1) . "h</span>";
            }
            $prevTime = $act['created_at'];
            echo "<tr>
          <td>" . ($i + 1) . "</td>
          <td><span class='$typeClass'><code>{$act['type']}</code></span></td>
          <td><code>" . substr($act['reference_id'] ?? '', 0, 12) . "...</code></td>
          <td>$stepLabel</td>
          <td class='info' style='font-size:11px'>" . htmlspecialchars(substr($act['details'] ?? '', 0, 80)) . "</td>
          <td style='white-space:nowrap'>{$act['created_at']}</td>
          <td>$gap</td>
        </tr>";
        }
        echo "</table>";
    }
    echo "</div>";

    if (!empty($emailOnlyLog)) {
        echo "<h3>📧 Email Activity Không Có flow_id (Campaign trực tiếp)</h3>";
        echo "<div class='card'><table><tr><th>Type</th><th>Campaign ID</th><th>Details</th><th>Time</th></tr>";
        foreach ($emailOnlyLog as $act) {
            echo "<tr>
          <td><code>{$act['type']}</code></td>
          <td>{$act['campaign_id']}</td>
          <td class='info' style='font-size:11px'>" . htmlspecialchars(substr($act['details'] ?? '', 0, 100)) . "</td>
          <td>{$act['created_at']}</td>
        </tr>";
        }
        echo "</table></div>";
    }

    // ─── SECTION 5: SIMULATE CHAIN EXECUTION ───────────────────────────
    echo "<h2>⚙️ Simulate Chain: Nếu Worker Chạy Ngay Bây Giờ</h2>";
    echo "<div class='card'>";
    echo "<div class='alert alert-info'>Mô phỏng chính xác logic worker_flow.php + FlowExecutor khi pick up subscriber này.</div>";

    $simChainStepId = $currentStepId;
    $simRunStep = 0;
    $simNowTs = time();
    $simNowStr = date('Y-m-d H:i:s', $simNowTs);
    $simItemScheduledAt = $state['scheduled_at'] ?? null;
    $simSchedTs = $simItemScheduledAt ? strtotime($simItemScheduledAt) : 0;

    $canBePickedUp = ($state['status'] === 'waiting' && $simSchedTs > 0 && $simSchedTs <= $simNowTs)
        || ($state['status'] === 'processing' && strtotime($state['updated_at'] ?? '') < ($simNowTs - 300) && $simSchedTs > 0 && $simSchedTs <= $simNowTs);

    echo "<div class='sim-row'>
  <span class='sim-label'>Sẽ được pick up?</span>
  <span class='sim-val'>" . ($canBePickedUp ? "<span class='ok'>✅ CÓ — Worker sẽ xử lý ngay</span>" : "<span class='warn'>⏸ CHƯA — scheduled_at=" . ($simItemScheduledAt ?? 'NULL') . " chưa đến hoặc status không đúng</span>") . "
  </span>
</div>";

    if (!$canBePickedUp) {
        if ($state['status'] === 'waiting') {
            $hoursLeft = round((strtotime($simItemScheduledAt) - $simNowTs) / 3600, 2);
            echo "<div class='alert alert-ok'>✅ Subscriber đang chạy đúng. Sẽ được xử lý sau <b>{$hoursLeft}h</b> (lúc $simItemScheduledAt).</div>";
        }
        echo "</div>";

        // Footer
        echo "<div class='meta' style='margin-top:20px'>Flow: $flowId | Sub: $subId | " . date('Y-m-d H:i:s') . " | <a href='?flow_id=$flowId'>← Back to flow</a></div>";
        echo "</body></html>";
        exit;
    }

    // Simulate chain steps
    echo "<br>";
    $simStep = 0;
    $chainStepId = $currentStepId;
    $itemScheduledAt = $state['scheduled_at'];

    for ($iter = 0; $iter < 10; $iter++) {
        $simStep++;
        $s = $stepMap[$chainStepId] ?? null;
        if (!$s) {
            echo "<div class='alert alert-err'>❌ Step không tìm thấy: <code>$chainStepId</code></div>";
            break;
        }

        $type = $s['type'];
        $cfg = $s['config'] ?? [];
        $label = $s['label'] ?? $type;

        // Compute is_resumed_wait for this step
        $isResumedWait = ($simStep === 1
            && trim((string) ($state['step_id'] ?? '')) === trim((string) $chainStepId)
            && $itemScheduledAt <= $simNowStr);

        $boxClass = $type === 'wait' ? 'step-wait' : ($type === 'action' ? 'step-action' : 'step-cond');
        $badgeClass = $type === 'wait' ? 'b-wait' : ($type === 'action' ? 'b-action' : 'b-cond');

        echo "<div class='step-box $boxClass' style='margin-bottom:8px'>";
        echo "<div><span class='badge $badgeClass'>Step $simStep: " . strtoupper($type) . "</span> <b style='margin-left:8px'>$label</b></div>";
        echo "<div style='margin-top:6px; padding-left:8px'>";

        if ($type === 'wait') {
            $mode = trim($cfg['mode'] ?? 'duration');
            echo "<div class='sim-row'><span class='sim-label'>mode:</span><span class='sim-val'><b>$mode</b></span></div>";
            echo "<div class='sim-row'><span class='sim-label'>is_resumed_wait:</span><span class='sim-val'>" .
                ($isResumedWait ? "<span class='ok'><b>TRUE</b> (step 1, ID match, scheduled passed)</span>" :
                    "<span class='warn'><b>FALSE</b> (step $simStep > 1 OR scheduled not passed)</span>") .
                "</span></div>";

            if ($isResumedWait) {
                echo "<div class='alert alert-ok' style='margin-top:4px'>✅ Wait HOÀN THÀNH → Tiến bước tiếp</div>";
                $nextId = $s['nextStepId'] ?? null;
                if (!$nextId) {
                    echo "<div class='alert alert-ok'>🏁 Flow COMPLETED!</div>";
                    break;
                }
                $chainStepId = $nextId;
                echo "</div></div>";
                continue;
            } else {
                // Calculate
                $isWaitOver = false;
                $nextScheduledAt = null;

                if ($mode === 'until_date') {
                    $specDate = $cfg['specificDate'] ?? '';
                    $targetTime2 = $cfg['untilTime'] ?? '09:00';
                    $targetTs = strtotime("$specDate $targetTime2:00");
                    $isWaitOver = ($targetTs <= $simNowTs);
                    if (!$isWaitOver)
                        $nextScheduledAt = date('Y-m-d H:i:s', $targetTs);
                    echo "<div class='sim-row'><span class='sim-label'>Target:</span><span class='sim-val'>$specDate $targetTime2 → " . date('Y-m-d H:i:s', $targetTs) . "</span></div>";
                } elseif ($mode === 'until') {
                    $targetTime2 = $cfg['untilTime'] ?? '09:00';
                    $dt = new DateTime($simNowStr);
                    $parts2 = explode(':', $targetTime2);
                    $dt->setTime((int) $parts2[0], (int) ($parts2[1] ?? 0), 0);
                    if ($dt->getTimestamp() <= $simNowTs)
                        $dt->modify("+1 day");
                    $nextScheduledAt = $dt->format('Y-m-d H:i:s');
                    echo "<div class='sim-row'><span class='sim-label'>Until time:</span><span class='sim-val'>$targetTime2 → $nextScheduledAt</span></div>";
                } elseif ($mode === 'duration') {
                    $dur = (int) ($cfg['duration'] ?? 1);
                    $unit = $cfg['unit'] ?? 'hours';
                    $dt = new DateTime($simNowStr);
                    $dt->modify("+$dur $unit");
                    $nextScheduledAt = $dt->format('Y-m-d H:i:s');
                    echo "<div class='sim-row'><span class='sim-label'>Duration:</span><span class='sim-val'>+$dur $unit → $nextScheduledAt</span></div>";
                }

                if ($isWaitOver) {
                    echo "<div class='alert alert-err'>❌ WAIT DATE ĐÃ QUA → isWaitOver=TRUE → Skip wait!</div>";
                    $nextId = $s['nextStepId'] ?? null;
                    if (!$nextId) {
                        echo "<div class='alert alert-ok'>🏁 Flow COMPLETED!</div>";
                        break;
                    }
                    $chainStepId = $nextId;
                    echo "</div></div>";
                    continue;
                } else {
                    echo "<div class='alert alert-ok'>⏸ DỪNG TẠI ĐÂY → scheduled_at = <b>$nextScheduledAt</b> → status=waiting</div>";
                    break;
                }
            }
        } elseif ($type === 'action') {
            $subject = $cfg['subject'] ?? '(no subject)';
            echo "<div class='sim-row'><span class='sim-label'>Subject:</span><span class='sim-val'>$subject</span></div>";
            echo "<div class='alert alert-ok'>📧 Email ĐƯỢC GỬI ⚡ (instant) → commit step_id → tiếp tục chain</div>";
            $nextId = $s['nextStepId'] ?? null;
            if (!$nextId) {
                echo "<div class='alert alert-ok'>🏁 Flow COMPLETED!</div>";
                break;
            }
            $chainStepId = $nextId;
        } else {
            echo "<div class='alert alert-info'>Step type '$type' — instant, tiếp tục chain.</div>";
            $nextId = $s['nextStepId'] ?? $s['yesStepId'] ?? null;
            if (!$nextId) {
                echo "<div class='alert alert-ok'>🏁 Flow COMPLETED!</div>";
                break;
            }
            $chainStepId = $nextId;
        }

        echo "</div></div>";
    }

    echo "</div>";

    // ─── SECTION 6: DIAGNOSIS CONCLUSION ───────────────────────────────
    echo "<h2>📝 Kết Luận & Chẩn Đoán</h2>";
    echo "<div class='card'>";

    // Check for wait_processed duplicates
    $dupStmt = $pdo->prepare("
    SELECT reference_id, COUNT(*) as cnt, 
           GROUP_CONCAT(created_at ORDER BY created_at SEPARATOR ' → ') as times
    FROM subscriber_activity
    WHERE subscriber_id = ? AND flow_id = ? AND type = 'wait_processed'
    GROUP BY reference_id
    HAVING cnt > 1
");
    $dupStmt->execute([$subId, $flowId]);
    $dupWaits = $dupStmt->fetchAll(PDO::FETCH_ASSOC);

    // Check for receive_email duplicates
    $dupEmail = $pdo->prepare("
    SELECT COUNT(*) as cnt, MIN(created_at) as first, MAX(created_at) as last,
           TIMESTAMPDIFF(SECOND, MIN(created_at), MAX(created_at)) as span_sec
    FROM subscriber_activity
    WHERE subscriber_id = ? AND flow_id = ?
    AND type IN ('receive_email','zalo_sent','zns_sent')
");
    $dupEmail->execute([$subId, $flowId]);
    $emailSummary = $dupEmail->fetch(PDO::FETCH_ASSOC);

    if (!empty($dupWaits)) {
        foreach ($dupWaits as $dw) {
            $stepLabel = ($stepMap[$dw['reference_id']]['label'] ?? 'Unknown');
            echo "<div class='alert alert-err'>
            ❌ <b>WAIT RESET DETECTED:</b> Bước <b>$stepLabel</b> bị xử lý <b>{$dw['cnt']} lần</b>!<br>
            Thời gian: <code>{$dw['times']}</code><br>
            <b>Nguyên nhân:</b> Worker crash sau step này nhưng trước khi commit bước tiếp → worker khác pick lại → wait bị tính lại.
            <br><b>Fix đã deploy:</b> step_id now persisted before each commit (crash recovery fix).
        </div>";
        }
    }

    // Count action steps — PHP 7.2 compatible (no arrow function)
    $actionStepCount = 0;
    foreach ($chain as $_s) {
        if ($_s['type'] === 'action')
            $actionStepCount++;
    }

    if ((int) $emailSummary['cnt'] > $actionStepCount) {
        echo "<div class='alert alert-err'>
        ❌ <b>EMAIL GỬI THỪA:</b> Subscriber nhận {$emailSummary['cnt']} email nhưng flow chỉ có $actionStepCount action step(s).<br>
        Span: {$emailSummary['span_sec']}s (từ {$emailSummary['first']} → {$emailSummary['last']})<br>
        <b>Nguyên nhân:</b> Concurrent workers xử lý cùng item.
    </div>";
    } elseif ((int) $emailSummary['cnt'] > 0) {
        echo "<div class='alert alert-ok'>✅ Email count ({$emailSummary['cnt']}) khớp với số action steps trong flow.</div>";
    }

    $currentStepInChain = null;
    foreach ($chain as $idx => $s) {
        if ($s['id'] === $currentStepId) {
            $currentStepInChain = $idx;
            break;
        }
    }

    if ($currentStepInChain === null) {
        echo "<div class='alert alert-err'>❌ <b>step_id trong DB không tồn tại trong flow!</b> Subscriber bị stuck với step_id cũ (flow đã được edit).</div>";
    } elseif ($state['status'] === 'waiting') {
        echo "<div class='alert alert-ok'>✅ Subscriber đang waiting đúng tại step #{$currentStepInChain} ({$currentStepInfo['label']}).</div>";
    } elseif ($state['status'] === 'processing') {
        echo "<div class='alert alert-warn'>⚠️ Subscriber đang processing — có thể đang được xử lý hoặc bị stuck.</div>";
    } elseif ($state['status'] === 'completed') {
        echo "<div class='alert alert-ok'>✅ Flow đã hoàn thành.</div>";
    } elseif ($state['status'] === 'failed') {
        echo "<div class='alert alert-err'>❌ Failed: " . htmlspecialchars($state['last_error'] ?? '') . "</div>";
    }

    echo "</div>";

    echo "<div class='meta' style='margin-top:20px'>Flow: $flowId | Sub: $subId | Generated: " . date('Y-m-d H:i:s') . " | <a href='?flow_id=$flowId'>← Back</a></div>";
    ?>
</body>

</html>