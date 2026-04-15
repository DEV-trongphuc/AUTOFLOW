<?php
// =============================================================================
// check_flow_deep.php — RÀ SOÁT SÂU FLOW EXECUTION
// Kiểm tra: bước bị skip, wait bị reset, gửi sai thứ tự, step mismatch
// Usage: /api/check_flow_deep.php?flow_id=69dca73f0d951
// =============================================================================

error_reporting(E_ALL);
ini_set('display_errors', 1);
date_default_timezone_set('Asia/Ho_Chi_Minh');
require_once __DIR__ . '/db_connect.php';
$pdo->exec("SET NAMES utf8mb4");

header('Content-Type: text/html; charset=utf-8');

$flowId  = $_GET['flow_id'] ?? '69dca73f0d951';
$limit   = (int)($_GET['limit'] ?? 100);
$fixMode = isset($_GET['fix']) && $_GET['fix'] === '1';

?><!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Flow Deep Check — <?= htmlspecialchars($flowId) ?></title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', monospace; background: #0f1117; color: #e4e4e7; font-size: 13px; padding: 16px; }
  h1  { color: #a78bfa; font-size: 20px; margin-bottom: 6px; }
  h2  { color: #60a5fa; font-size: 15px; margin: 20px 0 8px; border-left: 3px solid #60a5fa; padding-left: 8px; }
  h3  { color: #94a3b8; font-size: 13px; margin: 12px 0 4px; }
  .meta { color: #6b7280; font-size: 12px; margin-bottom: 20px; }
  .card { background: #1e2130; border: 1px solid #2d3148; border-radius: 8px; padding: 14px; margin-bottom: 12px; }
  .ok   { color: #34d399; } .warn { color: #fbbf24; } .err { color: #f87171; } .info { color: #93c5fd; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #1a1f35; color: #94a3b8; padding: 6px 8px; text-align: left; border-bottom: 1px solid #2d3148; }
  td { padding: 5px 8px; border-bottom: 1px solid #1e2130; vertical-align: top; word-break: break-all; }
  tr:hover td { background: #1a2040; }
  .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .b-waiting   { background:#1e3a5f; color:#93c5fd; }
  .b-processing{ background:#3d2e00; color:#fbbf24; }
  .b-completed { background:#14432a; color:#34d399; }
  .b-failed    { background:#3d1515; color:#f87171; }
  .b-unsubscribed { background:#2d1b4e; color:#c084fc; }
  .b-wait  { background:#1e3a5f; color:#93c5fd; }
  .b-action{ background:#14432a; color:#34d399; }
  .b-condition { background:#3d2e00; color:#fbbf24; }
  .b-trigger { background:#2d1b4e; color:#c084fc; }
  .alert { padding: 10px 14px; border-radius: 6px; margin-bottom: 10px; line-height: 1.6; }
  .alert-err  { background:#3d1515; border-left: 4px solid #f87171; }
  .alert-warn { background:#3d2e00; border-left: 4px solid #fbbf24; }
  .alert-ok   { background:#14432a; border-left: 4px solid #34d399; }
  .alert-info { background:#1e3a5f; border-left: 4px solid #93c5fd; }
  pre { background:#111827; padding: 10px; border-radius: 5px; overflow-x: auto; color: #d1d5db; font-size: 11px; }
  .section { margin-bottom: 28px; }
  a { color: #60a5fa; } a:hover { color: #93c5fd; }
  .fix-btn { background: #f87171; color: #fff; border: none; padding: 5px 12px; border-radius: 4px;
             cursor: pointer; font-size: 12px; text-decoration: none; display: inline-block; margin-top: 6px; }
  .pill { display:inline-block; margin: 2px; padding: 1px 6px; border-radius: 3px; font-size:11px; background:#2d3148; }
</style>
</head>
<body>
<?php

$now = date('Y-m-d H:i:s');
echo "<h1>🔬 Flow Deep Check</h1>";
echo "<div class='meta'>Flow ID: <b>$flowId</b> &nbsp;|&nbsp; Time: $now &nbsp;|&nbsp; Limit: $limit &nbsp;|&nbsp; <a href='?flow_id=$flowId&fix=1'>FIX MODE</a></div>";

// ============================================================
// LOAD FLOW
// ============================================================
$stmtFlow = $pdo->prepare("SELECT id, name, steps, config, status, stat_enrolled, stat_completed, stat_total_sent FROM flows WHERE id = ?");
$stmtFlow->execute([$flowId]);
$flow = $stmtFlow->fetch(PDO::FETCH_ASSOC);

if (!$flow) {
    echo "<div class='alert alert-err'>❌ Flow ID <b>$flowId</b> không tìm thấy!</div>";
    exit;
}

$flowSteps  = json_decode($flow['steps'], true) ?? [];
$flowConfig = json_decode($flow['config'], true) ?? [];

// Build step map
$stepMap = [];
foreach ($flowSteps as $s) {
    $stepMap[$s['id']] = $s;
}

// Build ordered step index (from trigger)
$triggerStep = null;
foreach ($flowSteps as $s) {
    if ($s['type'] === 'trigger') { $triggerStep = $s; break; }
}

// Traverse flow order
function traverseFlow($stepMap, $startId, $maxDepth = 50) {
    $order = [];
    $visited = [];
    $queue = [$startId];
    $depth = 0;
    while (!empty($queue) && $depth < $maxDepth) {
        $depth++;
        $id = array_shift($queue);
        if (!$id || isset($visited[$id]) || !isset($stepMap[$id])) continue;
        $visited[$id] = true;
        $s = $stepMap[$id];
        $order[] = ['id' => $id, 'type' => $s['type'], 'label' => $s['label'] ?? $s['type'], 'index' => count($order)];
        // Traverse nexts
        foreach (['nextStepId','yesStepId','noStepId','pathAStepId','pathBStepId'] as $k) {
            if (!empty($s[$k])) $queue[] = $s[$k];
        }
        // Advanced condition branches
        if (!empty($s['config']['branches'])) {
            foreach ($s['config']['branches'] as $b) {
                if (!empty($b['stepId'])) $queue[] = $b['stepId'];
            }
        }
        if (!empty($s['config']['defaultStepId'])) $queue[] = $s['config']['defaultStepId'];
    }
    return $order;
}

$flowOrder = [];
$stepIndexMap = []; // stepId => index in flow
if ($triggerStep && !empty($triggerStep['nextStepId'])) {
    $flowOrder = traverseFlow($stepMap, $triggerStep['nextStepId']);
    foreach ($flowOrder as $i => $s) {
        $stepIndexMap[$s['id']] = $i;
    }
}

// ============================================================
// SECTION 1: FLOW INFO
// ============================================================
echo "<div class='section'>";
echo "<h2>📋 Thông Tin Flow</h2>";
echo "<div class='card'>";
$statusColor = $flow['status'] === 'active' ? 'ok' : 'warn';
echo "<table><tr>
  <th>Tên</th><th>Trạng thái</th><th>Steps</th><th>Enrolled</th><th>Completed</th><th>Sent</th>
</tr><tr>
  <td><b>{$flow['name']}</b></td>
  <td><span class='$statusColor'>{$flow['status']}</span></td>
  <td>" . count($flowSteps) . "</td>
  <td>{$flow['stat_enrolled']}</td>
  <td>{$flow['stat_completed']}</td>
  <td>{$flow['stat_total_sent']}</td>
</tr></table>";

echo "<br><b>Thứ Tự Steps:</b><br><div style='margin-top:6px'>";
foreach ($flowOrder as $i => $s) {
    $typeClass = 'b-' . ($s['type'] === 'action' ? 'action' : ($s['type'] === 'wait' ? 'wait' : ($s['type'] === 'condition' ? 'condition' : 'wait')));
    echo "<span class='badge $typeClass pill'>#{$i} {$s['label']}</span> ";
}
echo "</div></div></div>";

// ============================================================
// SECTION 2: QUEUE STATUS SNAPSHOT
// ============================================================
echo "<div class='section'>";
echo "<h2>📊 Trạng Thái Queue</h2>";

$stmtStatus = $pdo->prepare("
    SELECT sfs.status,
           sfs.step_id,
           COUNT(*) as cnt,
           MIN(sfs.scheduled_at) as min_sch,
           MAX(sfs.scheduled_at) as max_sch,
           MIN(sfs.updated_at) as min_upd,
           MAX(sfs.updated_at) as max_upd
    FROM subscriber_flow_states sfs
    WHERE sfs.flow_id = ?
    GROUP BY sfs.status, sfs.step_id
    ORDER BY sfs.status, cnt DESC
");
$stmtStatus->execute([$flowId]);
$statusRows = $stmtStatus->fetchAll(PDO::FETCH_ASSOC);

echo "<div class='card'><table>
<tr><th>Status</th><th>Step ID</th><th>Step Label</th><th>Idx</th><th>Count</th><th>Min Scheduled</th><th>Max Scheduled</th><th>Last Updated</th></tr>";

$totalWaiting = 0; $totalProcessing = 0; $totalCompleted = 0; $totalFailed = 0;
foreach ($statusRows as $r) {
    $badgeClass = 'b-' . $r['status'];
    $stepInfo = $stepMap[$r['step_id']] ?? null;
    $stepLabel = $stepInfo ? ($stepInfo['label'] ?? $stepInfo['type']) : '⚠️ STEP NOT FOUND';
    $stepIdx = $stepIndexMap[$r['step_id']] ?? '?';
    $isStepMissing = !$stepInfo ? "<span class='err'>❌ ID không tồn tại trong flow!</span>" : '';
    if ($r['status'] === 'waiting') $totalWaiting += $r['cnt'];
    if ($r['status'] === 'processing') $totalProcessing += $r['cnt'];
    if ($r['status'] === 'completed') $totalCompleted += $r['cnt'];
    if ($r['status'] === 'failed') $totalFailed += $r['cnt'];

    // Flag stale processing
    $isStaleProc = '';
    if ($r['status'] === 'processing') {
        $isStaleProc = "<span class='warn'>⚠️ STALE PROCESSING</span>";
    }
    echo "<tr>
      <td><span class='badge $badgeClass'>{$r['status']}</span></td>
      <td><code>" . substr($r['step_id'], 0, 20) . "...</code></td>
      <td><b>$stepLabel</b> $isStepMissing $isStaleProc</td>
      <td>#{$stepIdx}</td>
      <td><b>{$r['cnt']}</b></td>
      <td>{$r['min_sch']}</td>
      <td>{$r['max_sch']}</td>
      <td>{$r['max_upd']}</td>
    </tr>";
}
echo "</table>";
echo "<br><b>Tổng:</b> Waiting=<span class='warn'>$totalWaiting</span> | Processing=<span class='err'>$totalProcessing</span> | Completed=<span class='ok'>$totalCompleted</span> | Failed=<span class='err'>$totalFailed</span>";
echo "</div></div>";

// ============================================================
// SECTION 3: STALE PROCESSING DETECTION
// ============================================================
echo "<div class='section'>";
echo "<h2>⚠️ Stale Processing Items (Nguy Hiểm)</h2>";

// Stale type A: processing với scheduled_at trong tương lai (cái này reset wait)
$stmtStaleA = $pdo->prepare("
    SELECT sfs.id, sfs.subscriber_id, sfs.step_id, sfs.status,
           sfs.scheduled_at, sfs.updated_at, s.email
    FROM subscriber_flow_states sfs
    JOIN subscribers s ON sfs.subscriber_id = s.id
    WHERE sfs.flow_id = ?
    AND sfs.status = 'processing'
    AND sfs.scheduled_at > NOW()
    ORDER BY sfs.scheduled_at ASC
    LIMIT ?
");
$stmtStaleA->execute([$flowId, $limit]);
$staleA = $stmtStaleA->fetchAll(PDO::FETCH_ASSOC);

if (empty($staleA)) {
    echo "<div class='alert alert-ok'>✅ Không có stale processing với scheduled_at trong tương lai.</div>";
} else {
    echo "<div class='alert alert-err'>❌ <b>" . count($staleA) . " items</b> đang ở <code>processing</code> nhưng scheduled_at CÒN TRONG TƯƠNG LAI — đây là nguyên nhân reset wait!</div>";
    if ($fixMode) {
        $ids = array_column($staleA, 'id');
        $ph = implode(',', array_fill(0, count($ids), '?'));
        $fixed = $pdo->prepare("UPDATE subscriber_flow_states SET status='waiting', updated_at=NOW() WHERE id IN ($ph)");
        $fixed->execute($ids);
        echo "<div class='alert alert-ok'>✅ FIX: Đã reset " . count($ids) . " items về 'waiting'.</div>";
    } else {
        echo "<a class='fix-btn' href='?flow_id=$flowId&fix=1&limit=$limit'>🔧 FIX: Reset về waiting</a>";
    }
    echo "<table style='margin-top:8px'><tr><th>ID</th><th>Subscriber</th><th>Email</th><th>Step</th><th>scheduled_at</th><th>updated_at</th></tr>";
    foreach ($staleA as $r) {
        $stepLabel = ($stepMap[$r['step_id']]['label'] ?? '?');
        $diff = round((strtotime($r['scheduled_at']) - time()) / 3600, 1);
        echo "<tr>
          <td>{$r['id']}</td>
          <td>{$r['subscriber_id']}</td>
          <td>{$r['email']}</td>
          <td>$stepLabel</td>
          <td><span class='warn'>{$r['scheduled_at']}</span> <span class='info'>(còn {$diff}h)</span></td>
          <td>{$r['updated_at']}</td>
        </tr>";
    }
    echo "</table>";
}

// Stale type B: processing cũ > 15 phút (stuck)
$stmtStaleB = $pdo->prepare("
    SELECT sfs.id, sfs.subscriber_id, sfs.step_id, sfs.status,
           sfs.scheduled_at, sfs.updated_at, s.email,
           TIMESTAMPDIFF(MINUTE, sfs.updated_at, NOW()) as stuck_min
    FROM subscriber_flow_states sfs
    JOIN subscribers s ON sfs.subscriber_id = s.id
    WHERE sfs.flow_id = ?
    AND sfs.status = 'processing'
    AND sfs.updated_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE)
    AND sfs.scheduled_at <= NOW()
    ORDER BY sfs.updated_at ASC
    LIMIT ?
");
$stmtStaleB->execute([$flowId, $limit]);
$staleB = $stmtStaleB->fetchAll(PDO::FETCH_ASSOC);

echo "<h3 style='margin-top:14px'>Processing Cũ > 15 Phút (Stuck)</h3>";
if (empty($staleB)) {
    echo "<div class='alert alert-ok'>✅ Không có processing stuck lâu.</div>";
} else {
    echo "<div class='alert alert-warn'>⚠️ <b>" . count($staleB) . " items</b> bị stuck processing > 15 phút.</div>";
    echo "<table><tr><th>ID</th><th>Email</th><th>Step</th><th>Stuck (phút)</th><th>scheduled_at</th></tr>";
    foreach ($staleB as $r) {
        $stepLabel = ($stepMap[$r['step_id']]['label'] ?? '?');
        echo "<tr>
          <td>{$r['id']}</td>
          <td>{$r['email']}</td>
          <td>$stepLabel</td>
          <td><span class='err'>{$r['stuck_min']}</span></td>
          <td>{$r['scheduled_at']}</td>
        </tr>";
    }
    echo "</table>";
}
echo "</div>";

// ============================================================
// SECTION 4: STEP SKIP DETECTION — So sánh activity vs expected
// ============================================================
echo "<div class='section'>";
echo "<h2>🔍 Phát Hiện Bước Bị Skip / Lọt</h2>";

// Lấy activity của flow này
$stmtAct = $pdo->prepare("
    SELECT subscriber_id, type, reference_id, created_at
    FROM subscriber_activity
    WHERE flow_id = ?
    AND type IN ('receive_email','wait_processed','condition_true','condition_false',
                 'enter_flow','complete_flow','exit_flow','zalo_sent','zns_sent','meta_sent',
                 'update_tag','list_action','ab_test_a','ab_test_b','advanced_condition')
    ORDER BY subscriber_id, created_at ASC
");
$stmtAct->execute([$flowId]);
$allActivities = $stmtAct->fetchAll(PDO::FETCH_ASSOC);

// Group by subscriber
$subActivities = [];
foreach ($allActivities as $act) {
    $subActivities[$act['subscriber_id']][] = $act;
}

// Action/Wait steps that MUST appear in activity for completed flows
$requiredSteps = [];
foreach ($flowOrder as $s) {
    if (in_array($s['type'], ['action','wait','zalo_zns','zalo_cs','meta_message'])) {
        $requiredSteps[] = $s;
    }
}

// Check completed subscribers for skipped steps
$stmtCompleted = $pdo->prepare("
    SELECT sfs.subscriber_id, sfs.step_id, s.email
    FROM subscriber_flow_states sfs
    JOIN subscribers s ON sfs.subscriber_id = s.id
    WHERE sfs.flow_id = ?
    AND sfs.status = 'completed'
    ORDER BY sfs.updated_at DESC
    LIMIT ?
");
$stmtCompleted->execute([$flowId, $limit]);
$completedSubs = $stmtCompleted->fetchAll(PDO::FETCH_ASSOC);

$skipIssues = [];
foreach ($completedSubs as $sub) {
    $sid = $sub['subscriber_id'];
    $acts = $subActivities[$sid] ?? [];
    $actRefIds = array_column($acts, 'reference_id');
    $actTypes  = array_column($acts, 'type');

    foreach ($requiredSteps as $rs) {
        // Check if action step has a corresponding receive_email or similar
        if ($rs['type'] === 'action') {
            if (!in_array('receive_email', $actTypes) && !in_array('failed_email', $actTypes)) {
                $skipIssues[] = [
                    'subscriber_id' => $sid,
                    'email'         => $sub['email'],
                    'issue'         => "Không có receive_email hoặc failed_email dù flow completed",
                    'step'          => $rs['label'],
                ];
            }
        }
        if ($rs['type'] === 'wait') {
            // wait_processed phải có
            if (!in_array('wait_processed', $actTypes)) {
                $skipIssues[] = [
                    'subscriber_id' => $sid,
                    'email'         => $sub['email'],
                    'issue'         => "Không có wait_processed dù flow completed — wait bị skip!",
                    'step'          => $rs['label'],
                ];
            }
        }
    }
}

if (empty($skipIssues)) {
    echo "<div class='alert alert-ok'>✅ Không phát hiện bước bị skip trong " . count($completedSubs) . " completed subscribers (sample).</div>";
} else {
    $uniqueIssues = array_unique(array_column($skipIssues, 'subscriber_id'));
    echo "<div class='alert alert-err'>❌ Phát hiện <b>" . count($uniqueIssues) . " subscribers</b> có bước bị skip!</div>";
    echo "<table><tr><th>Subscriber</th><th>Email</th><th>Vấn Đề</th><th>Step</th></tr>";
    $shown = 0;
    foreach ($skipIssues as $iss) {
        if ($shown++ > 50) { echo "<tr><td colspan='4' class='warn'>...còn nữa (limit 50)</td></tr>"; break; }
        echo "<tr>
          <td>{$iss['subscriber_id']}</td>
          <td>{$iss['email']}</td>
          <td><span class='err'>{$iss['issue']}</span></td>
          <td>{$iss['step']}</td>
        </tr>";
    }
    echo "</table>";
}
echo "</div>";

// ============================================================
// SECTION 5: WAIT RESET DETECTION
// ============================================================
echo "<div class='section'>";
echo "<h2>⏰ Phát Hiện Wait Bị Reset</h2>";

// Tìm subscribers có nhiều hơn 1 wait_processed cho cùng 1 step → wait bị tính lại nhiều lần
$stmtWaitReset = $pdo->prepare("
    SELECT subscriber_id, reference_id, COUNT(*) as cnt, 
           MIN(created_at) as first_time, MAX(created_at) as last_time
    FROM subscriber_activity
    WHERE flow_id = ?
    AND type = 'wait_processed'
    GROUP BY subscriber_id, reference_id
    HAVING cnt > 1
    ORDER BY cnt DESC
    LIMIT ?
");
$stmtWaitReset->execute([$flowId, $limit]);
$waitResets = $stmtWaitReset->fetchAll(PDO::FETCH_ASSOC);

// Tìm cả wait_processed có khoảng cách bất thường (< 10 phút sau lần trước = reset ngay)
$stmtWaitGap = $pdo->prepare("
    SELECT a1.subscriber_id, a1.reference_id, a1.created_at as t1, a2.created_at as t2,
           TIMESTAMPDIFF(MINUTE, a1.created_at, a2.created_at) as gap_min, s.email
    FROM subscriber_activity a1
    JOIN subscriber_activity a2 ON a1.subscriber_id = a2.subscriber_id
        AND a1.reference_id = a2.reference_id
        AND a1.type = 'wait_processed'
        AND a2.type = 'wait_processed'
        AND a2.created_at > a1.created_at
    JOIN subscribers s ON a1.subscriber_id = s.id
    WHERE a1.flow_id = ?
    AND TIMESTAMPDIFF(MINUTE, a1.created_at, a2.created_at) < 60
    ORDER BY gap_min ASC
    LIMIT ?
");
$stmtWaitGap->execute([$flowId, $limit]);
$waitGaps = $stmtWaitGap->fetchAll(PDO::FETCH_ASSOC);

if (empty($waitResets)) {
    echo "<div class='alert alert-ok'>✅ Không có wait_processed trùng lặp cho cùng step.</div>";
} else {
    echo "<div class='alert alert-err'>❌ <b>" . count($waitResets) . " trường hợp</b> wait_processed được ghi > 1 lần cho cùng step → Wait bị reset!</div>";
    echo "<table><tr><th>Subscriber</th><th>Step ID</th><th>Step Label</th><th>Số Lần</th><th>Lần Đầu</th><th>Lần Cuối</th></tr>";
    foreach ($waitResets as $r) {
        $stepLabel = ($stepMap[$r['reference_id']]['label'] ?? '?');
        echo "<tr>
          <td>{$r['subscriber_id']}</td>
          <td><code>" . substr($r['reference_id'], 0, 16) . "...</code></td>
          <td>$stepLabel</td>
          <td><span class='err'><b>{$r['cnt']}</b></span></td>
          <td>{$r['first_time']}</td>
          <td>{$r['last_time']}</td>
        </tr>";
    }
    echo "</table>";
}

if (!empty($waitGaps)) {
    echo "<div class='alert alert-warn' style='margin-top:10px'>⚠️ <b>" . count($waitGaps) . " trường hợp</b> wait_processed 2 lần cách nhau < 60 phút (reset nhanh):</div>";
    echo "<table><tr><th>Subscriber</th><th>Email</th><th>Step</th><th>Lần 1</th><th>Lần 2</th><th>Gap</th></tr>";
    foreach ($waitGaps as $r) {
        $stepLabel = ($stepMap[$r['reference_id']]['label'] ?? '?');
        echo "<tr>
          <td>{$r['subscriber_id']}</td>
          <td>{$r['email']}</td>
          <td>$stepLabel</td>
          <td>{$r['t1']}</td>
          <td>{$r['t2']}</td>
          <td><span class='err'>{$r['gap_min']} phút</span></td>
        </tr>";
    }
    echo "</table>";
}
echo "</div>";

// ============================================================
// SECTION 6: STEP INCONSISTENCY — Người đang ở bước sai thứ tự
// ============================================================
echo "<div class='section'>";
echo "<h2>🔀 Step Inconsistency — Bước Sai Thứ Tự</h2>";
echo "<p class='meta'>Tìm subscribers đang waiting ở step TRƯỚC bước họ đã hoàn thành trong activity log:</p>";

$stmtWaiting = $pdo->prepare("
    SELECT sfs.id, sfs.subscriber_id, sfs.step_id, sfs.status, sfs.scheduled_at,
           s.email
    FROM subscriber_flow_states sfs
    JOIN subscribers s ON sfs.subscriber_id = s.id
    WHERE sfs.flow_id = ?
    AND sfs.status IN ('waiting','processing')
    ORDER BY sfs.scheduled_at ASC
    LIMIT ?
");
$stmtWaiting->execute([$flowId, $limit]);
$waitingItems = $stmtWaiting->fetchAll(PDO::FETCH_ASSOC);

$inconsistencies = [];
foreach ($waitingItems as $item) {
    $sid = $item['subscriber_id'];
    $currentStepIdx = $stepIndexMap[$item['step_id']] ?? null;
    if ($currentStepIdx === null) {
        $inconsistencies[] = [
            'type'     => 'STEP_NOT_IN_FLOW',
            'sid'      => $sid,
            'email'    => $item['email'],
            'step_id'  => $item['step_id'],
            'detail'   => "step_id không tồn tại trong cấu hình flow!",
            'current_idx' => '?',
            'expected_idx' => '?',
        ];
        continue;
    }

    // Check activity: has any activity at a step AFTER current step?
    $acts = $subActivities[$sid] ?? [];
    foreach ($acts as $act) {
        $actStepIdx = $stepIndexMap[$act['reference_id']] ?? null;
        if ($actStepIdx !== null && $actStepIdx > $currentStepIdx) {
            $inconsistencies[] = [
                'type'     => 'BACKWARD_STEP',
                'sid'      => $sid,
                'email'    => $item['email'],
                'step_id'  => $item['step_id'],
                'detail'   => "Đang waiting step #{$currentStepIdx} nhưng đã có activity ở step #{$actStepIdx} ({$act['type']})",
                'current_idx'  => $currentStepIdx,
                'expected_idx' => $actStepIdx,
            ];
            break;
        }
    }
}

if (empty($inconsistencies)) {
    echo "<div class='alert alert-ok'>✅ Không phát hiện inconsistency bước trong " . count($waitingItems) . " waiting items.</div>";
} else {
    echo "<div class='alert alert-err'>❌ <b>" . count($inconsistencies) . " inconsistencies</b> phát hiện!</div>";
    echo "<table><tr><th>Type</th><th>Subscriber</th><th>Email</th><th>Step Hiện Tại</th><th>Chi Tiết</th></tr>";
    foreach (array_slice($inconsistencies, 0, 50) as $iss) {
        $stepLabel = ($stepMap[$iss['step_id']]['label'] ?? $iss['step_id']);
        echo "<tr>
          <td><span class='err'>{$iss['type']}</span></td>
          <td>{$iss['sid']}</td>
          <td>{$iss['email']}</td>
          <td>#" . htmlspecialchars($iss['current_idx']) . " <b>$stepLabel</b></td>
          <td class='warn'>{$iss['detail']}</td>
        </tr>";
    }
    echo "</table>";
}
echo "</div>";

// ============================================================
// SECTION 7: DUPLICATE ENROLLMENT
// ============================================================
echo "<div class='section'>";
echo "<h2>👥 Duplicate Enrollment</h2>";

$stmtDupe = $pdo->prepare("
    SELECT subscriber_id, COUNT(*) as cnt, 
           GROUP_CONCAT(status ORDER BY created_at) as statuses,
           GROUP_CONCAT(id ORDER BY created_at) as ids
    FROM subscriber_flow_states
    WHERE flow_id = ?
    GROUP BY subscriber_id
    HAVING cnt > 1
    ORDER BY cnt DESC
    LIMIT ?
");
$stmtDupe->execute([$flowId, $limit]);
$dupes = $stmtDupe->fetchAll(PDO::FETCH_ASSOC);

if (empty($dupes)) {
    echo "<div class='alert alert-ok'>✅ Không có duplicate enrollment.</div>";
} else {
    echo "<div class='alert alert-warn'>⚠️ <b>" . count($dupes) . " subscribers</b> được enroll nhiều hơn 1 lần.</div>";
    echo "<table><tr><th>Subscriber</th><th>Số lần</th><th>Statuses</th><th>IDs</th></tr>";
    foreach ($dupes as $d) {
        echo "<tr>
          <td>{$d['subscriber_id']}</td>
          <td><b>{$d['cnt']}</b></td>
          <td><code>{$d['statuses']}</code></td>
          <td><code>{$d['ids']}</code></td>
        </tr>";
    }
    echo "</table>";
}
echo "</div>";

// ============================================================
// SECTION 8: SEND ORDER ISSUES (gửi nhiều lần)
// ============================================================
echo "<div class='section'>";
echo "<h2>📨 Gửi Email Nhiều Lần Cùng Flow</h2>";

$stmtMultiSend = $pdo->prepare("
    SELECT subscriber_id, COUNT(*) as cnt, MIN(created_at) as first_sent, MAX(created_at) as last_sent,
           TIMESTAMPDIFF(MINUTE, MIN(created_at), MAX(created_at)) as span_min
    FROM subscriber_activity
    WHERE flow_id = ?
    AND type IN ('receive_email','zalo_sent','zns_sent','meta_sent')
    GROUP BY subscriber_id
    HAVING cnt > 1
    ORDER BY cnt DESC
    LIMIT ?
");
$stmtMultiSend->execute([$flowId, $limit]);
$multiSends = $stmtMultiSend->fetchAll(PDO::FETCH_ASSOC);

if (empty($multiSends)) {
    echo "<div class='alert alert-ok'>✅ Không có subscriber nào nhận mail/zalo nhiều lần trong flow này.</div>";
} else {
    $unexpectedMulti = array_filter($multiSends, fn($r) => $r['cnt'] > count($flowOrder));
    echo "<div class='alert " . (empty($unexpectedMulti) ? 'alert-info' : 'alert-warn') . "'>
        📬 <b>" . count($multiSends) . " subscribers</b> nhận hơn 1 lần. 
        " . (count($unexpectedMulti) > 0 ? "<span class='err'>⚠️ " . count($unexpectedMulti) . " người nhận nhiều hơn số action steps!</span>" : "(Bình thường nếu flow có nhiều action step)") . "
    </div>";
    echo "<table><tr><th>Subscriber</th><th>Số Lần</th><th>Lần Đầu</th><th>Lần Cuối</th><th>Span (phút)</th></tr>";
    foreach (array_slice($multiSends, 0, 30) as $r) {
        $isAnomaly = $r['cnt'] > count($flowOrder);
        echo "<tr>
          <td>{$r['subscriber_id']}</td>
          <td>" . ($isAnomaly ? "<span class='err'>" : "") . "<b>{$r['cnt']}</b>" . ($isAnomaly ? "</span>" : "") . "</td>
          <td>{$r['first_sent']}</td>
          <td>{$r['last_sent']}</td>
          <td>{$r['span_min']}</td>
        </tr>";
    }
    echo "</table>";
}
echo "</div>";

// ============================================================
// SECTION 8b: TRACE ANOMALOUS MULTI-SEND SUBSCRIBERS
// ============================================================
echo "<div class='section'>";
echo "<h2>🚨 Trace Subscriber Gửi Bất Thường (> N lần trong &lt; 5 phút)</h2>";

$stmtAnomaly = $pdo->prepare("
    SELECT sa.subscriber_id, s.email, sa.type,
           GROUP_CONCAT(sa.reference_id ORDER BY sa.created_at SEPARATOR ' → ') as step_trace,
           GROUP_CONCAT(sa.created_at ORDER BY sa.created_at SEPARATOR ' | ') as time_trace,
           COUNT(*) as cnt,
           TIMESTAMPDIFF(SECOND, MIN(sa.created_at), MAX(sa.created_at)) as span_sec
    FROM subscriber_activity sa
    JOIN subscribers s ON sa.subscriber_id = s.id
    WHERE sa.flow_id = ?
    AND sa.type IN ('receive_email','zalo_sent','zns_sent','meta_sent')
    GROUP BY sa.subscriber_id, sa.type
    HAVING cnt > 1 AND span_sec < 300
    ORDER BY cnt DESC, span_sec ASC
    LIMIT 20
");
$stmtAnomaly->execute([$flowId]);
$anomalies = $stmtAnomaly->fetchAll(PDO::FETCH_ASSOC);

if (empty($anomalies)) {
    echo "<div class='alert alert-ok'>✅ Không có subscriber nào nhận email/zalo nhiều hơn 1 lần trong vòng 5 phút.</div>";
} else {
    echo "<div class='alert alert-err'>❌ <b>" . count($anomalies) . " subscribers</b> nhận gửi nhiều lần trong &lt; 5 phút — đây là dấu hiệu worker xử lý trùng!</div>";
    echo "<table><tr><th>Subscriber</th><th>Email</th><th>Type</th><th>Số Lần</th><th>Span (s)</th><th>Step Trace</th><th>Time Trace</th></tr>";
    foreach ($anomalies as $r) {
        echo "<tr>
          <td><a href='?flow_id=$flowId&trace_sub={$r['subscriber_id']}&limit=$limit'>{$r['subscriber_id']}</a></td>
          <td>{$r['email']}</td>
          <td><code>{$r['type']}</code></td>
          <td><span class='err'><b>{$r['cnt']}</b></span></td>
          <td><span class='warn'>{$r['span_sec']}s</span></td>
          <td class='info'><small>" . htmlspecialchars(substr($r['step_trace'], 0, 100)) . "</small></td>
          <td><small>" . htmlspecialchars($r['time_trace']) . "</small></td>
        </tr>";
    }
    echo "</table>";
}

// Hiển thị ALL status của các items bị abandon (step_id không match + updated cũ)
echo "<h3 style='margin-top:14px'>🔍 Items Bí Ẩn — Tất Cả Status Ở Từng Step (Kể Cả NULL, 0000)</h3>";
$stmtAllStatus = $pdo->prepare("
    SELECT sfs.id, sfs.subscriber_id, sfs.step_id, sfs.status, 
           sfs.scheduled_at, sfs.updated_at, sfs.created_at, sfs.last_error,
           s.email
    FROM subscriber_flow_states sfs
    JOIN subscribers s ON sfs.subscriber_id = s.id
    WHERE sfs.flow_id = ?
    AND (
        sfs.status = 'processing'
        OR sfs.scheduled_at = '0000-00-00 00:00:00'
        OR sfs.scheduled_at IS NULL
        OR (sfs.status = 'waiting' AND sfs.updated_at < DATE_SUB(NOW(), INTERVAL 3 DAY))
    )
    ORDER BY sfs.updated_at ASC
    LIMIT 30
");
$stmtAllStatus->execute([$flowId]);
$abandons = $stmtAllStatus->fetchAll(PDO::FETCH_ASSOC);

if (empty($abandons)) {
    echo "<div class='alert alert-ok'>✅ Không có items bị abandon hoặc NULL scheduled.</div>";
} else {
    echo "<div class='alert alert-warn'>⚠️ <b>" . count($abandons) . " items đáng ngờ</b> (processing stuck / schedule NULL / waiting cũ > 3 ngày):</div>";
    echo "<table><tr><th>ID</th><th>Subscriber</th><th>Email</th><th>Step</th><th>Status</th><th>scheduled_at</th><th>updated_at</th><th>last_error</th></tr>";
    foreach ($abandons as $r) {
        $stepLabel = ($stepMap[$r['step_id']]['label'] ?? '<span class=\'err\'>NOT FOUND</span>');
        $statusClass = 'b-' . $r['status'];
        $isNull0 = ($r['scheduled_at'] === '0000-00-00 00:00:00' || $r['scheduled_at'] === null);
        echo "<tr>
          <td>{$r['id']}</td>
          <td><a href='?flow_id=$flowId&trace_sub={$r['subscriber_id']}'>{$r['subscriber_id']}</a></td>
          <td>{$r['email']}</td>
          <td>$stepLabel</td>
          <td><span class='badge $statusClass'>{$r['status']}</span></td>
          <td>" . ($isNull0 ? "<span class='err'>{$r['scheduled_at']}</span>" : "<span class='warn'>{$r['scheduled_at']}</span>") . "</td>
          <td>{$r['updated_at']}</td>
          <td class='err'>" . htmlspecialchars($r['last_error'] ?? '') . "</td>
        </tr>";
    }
    echo "</table>";

    if ($fixMode) {
        // Fix: reset truly stuck processing items (no future schedule) to waiting
        $staleIds = array_column(
            array_filter($abandons, fn($r) => $r['status'] === 'processing' && strtotime($r['scheduled_at']) <= time()),
            'id'
        );
        if (!empty($staleIds)) {
            $ph = implode(',', array_fill(0, count($staleIds), '?'));
            $pdo->prepare("UPDATE subscriber_flow_states SET status='waiting', updated_at=NOW() WHERE id IN ($ph)")->execute($staleIds);
            echo "<div class='alert alert-ok'>✅ FIX: Reset " . count($staleIds) . " stuck processing items về waiting.</div>";
        }
    }
}

echo "</div>";

// ============================================================
// SECTION 9: SAMPLE - TRACE 1 SPECIFIC SUBSCRIBER
// ============================================================
echo "<div class='section'>";
echo "<h2>🔎 Trace Chi Tiết 1 Subscriber (sample)</h2>";

$traceSid = $_GET['trace_sub'] ?? null;
if (!$traceSid) {
    // Pick a waiting subscriber
    $stmtPickOne = $pdo->prepare("SELECT subscriber_id FROM subscriber_flow_states WHERE flow_id = ? AND status = 'waiting' LIMIT 1");
    $stmtPickOne->execute([$flowId]);
    $traceSid = $stmtPickOne->fetchColumn();
}

if ($traceSid) {
    $stmtState = $pdo->prepare("
        SELECT sfs.*, s.email, s.first_name, s.last_name
        FROM subscriber_flow_states sfs
        JOIN subscribers s ON sfs.subscriber_id = s.id
        WHERE sfs.flow_id = ? AND sfs.subscriber_id = ?
        ORDER BY sfs.created_at DESC LIMIT 1
    ");
    $stmtState->execute([$flowId, $traceSid]);
    $stateRow = $stmtState->fetch(PDO::FETCH_ASSOC);

    echo "<div class='meta'>Subscriber: <b>{$stateRow['email']}</b> (ID: $traceSid) — <a href='?flow_id=$flowId&trace_sub=$traceSid&limit=$limit'>pin this subscriber</a></div>";
    echo "<div class='card'><table>
    <tr><th>Field</th><th>Value</th></tr>
    <tr><td>Queue ID</td><td>{$stateRow['id']}</td></tr>
    <tr><td>Status</td><td><span class='badge b-{$stateRow['status']}'>{$stateRow['status']}</span></td></tr>
    <tr><td>Step ID</td><td><code>{$stateRow['step_id']}</code></td></tr>
    <tr><td>Step Label</td><td><b>" . ($stepMap[$stateRow['step_id']]['label'] ?? '❌ NOT FOUND') . "</b></td></tr>
    <tr><td>Step Index</td><td>#" . ($stepIndexMap[$stateRow['step_id']] ?? '?') . "</td></tr>
    <tr><td>scheduled_at</td><td>" . ($stateRow['scheduled_at'] > $now ? "<span class='warn'>{$stateRow['scheduled_at']}</span>" : "<span class='ok'>{$stateRow['scheduled_at']}</span>") . "</td></tr>
    <tr><td>updated_at</td><td>{$stateRow['updated_at']}</td></tr>
    <tr><td>created_at</td><td>{$stateRow['created_at']}</td></tr>
    <tr><td>last_step_at</td><td>" . ($stateRow['last_step_at'] ?? 'NULL') . "</td></tr>
    <tr><td>last_error</td><td>" . ($stateRow['last_error'] ?? 'NULL') . "</td></tr>
    </table></div>";

    // Activity log for this subscriber in this flow
    $stmtSubAct = $pdo->prepare("
        SELECT type, reference_id, details, created_at
        FROM subscriber_activity
        WHERE subscriber_id = ? AND flow_id = ?
        ORDER BY created_at ASC
    ");
    $stmtSubAct->execute([$traceSid, $flowId]);
    $subActLog = $stmtSubAct->fetchAll(PDO::FETCH_ASSOC);

    echo "<h3>Activity Log ({" . count($subActLog) . "} events)</h3>";
    if (empty($subActLog)) {
        echo "<div class='alert alert-warn'>⚠️ Không có activity log cho subscriber này trong flow này.</div>";
    } else {
        echo "<table><tr><th>#</th><th>Type</th><th>Step</th><th>Step Label</th><th>Details</th><th>Time</th></tr>";
        foreach ($subActLog as $i => $act) {
            $stepLabel = ($stepMap[$act['reference_id']]['label'] ?? '?');
            $stepIdx = $stepIndexMap[$act['reference_id']] ?? '?';
            echo "<tr>
              <td>" . ($i+1) . "</td>
              <td><code>{$act['type']}</code></td>
              <td>#{$stepIdx}</td>
              <td>$stepLabel</td>
              <td class='info'>" . htmlspecialchars(substr($act['details'] ?? '', 0, 80)) . "</td>
              <td>{$act['created_at']}</td>
            </tr>";
        }
        echo "</table>";
    }
} else {
    echo "<div class='alert alert-info'>ℹ️ Không có waiting subscriber để trace. Thêm ?trace_sub=ID vào URL.</div>";
}
echo "</div>";

// ============================================================
// SECTION 10: IS_RESUMED_WAIT LOGIC AUDIT (live simulation)
// ============================================================
echo "<div class='section'>";
echo "<h2>🧪 Live Simulation: is_resumed_wait Logic</h2>";
echo "<p class='meta'>Mô phỏng logic worker_flow để kiểm tra ai sẽ bị reset wait nếu worker chạy ngay bây giờ:</p>";

$stmtSim = $pdo->prepare("
    SELECT sfs.id, sfs.subscriber_id, sfs.step_id, sfs.status, sfs.scheduled_at, sfs.updated_at,
           s.email
    FROM subscriber_flow_states sfs
    JOIN subscribers s ON sfs.subscriber_id = s.id
    WHERE sfs.flow_id = ?
    AND sfs.status IN ('waiting','processing')
    ORDER BY sfs.scheduled_at ASC
    LIMIT 30
");
$stmtSim->execute([$flowId]);
$simItems = $stmtSim->fetchAll(PDO::FETCH_ASSOC);

$simNow = date('Y-m-d H:i:s');
echo "<div class='card'><table>
<tr><th>Sub</th><th>Email</th><th>Status</th><th>Step</th><th>scheduled_at</th><th>is_resumed_wait</th><th>Prediction</th></tr>";
foreach ($simItems as $item) {
    $stepInfo = $stepMap[$item['step_id']] ?? null;
    $stepType = $stepInfo['type'] ?? '?';
    $stepLabel = $stepInfo['label'] ?? '?';
    $scheduledAt = $item['scheduled_at'];
    $is_resumed = ($scheduledAt <= $simNow) ? true : false;
    $isWaitStep = ($stepType === 'wait');

    if ($isWaitStep) {
        if ($is_resumed) {
            $pred = "<span class='ok'>✅ Wait sẽ HOÀN THÀNH — tiến bước tiếp</span>";
        } else {
            if ($item['status'] === 'processing') {
                $pred = "<span class='err'>❌ NGUY HIỂM: processing + scheduled tương lai → sẽ RESET wait timer!</span>";
            } else {
                $pred = "<span class='info'>⏸ Waiting đúng — chưa đến hạn</span>";
            }
        }
    } else {
        $pred = "<span class='info'>Step type: $stepType — không phải wait</span>";
    }

    $statusClass = 'b-' . $item['status'];
    $sch_display = $scheduledAt > $simNow 
        ? "<span class='warn'>$scheduledAt</span>" 
        : "<span class='ok'>$scheduledAt</span>";

    echo "<tr>
      <td>{$item['subscriber_id']}</td>
      <td>{$item['email']}</td>
      <td><span class='badge $statusClass'>{$item['status']}</span></td>
      <td><b>$stepLabel</b> <span class='info'>($stepType)</span></td>
      <td>$sch_display</td>
      <td>" . ($is_resumed ? "<span class='ok'>TRUE</span>" : "<span class='warn'>FALSE</span>") . "</td>
      <td>$pred</td>
    </tr>";
}
echo "</table></div></div>";

// ============================================================
// SECTION 11: SUMMARY & RECOMMENDATIONS
// ============================================================
echo "<div class='section'>";
echo "<h2>📝 Tóm Tắt & Khuyến Nghị</h2>";
echo "<div class='card'>";

$issueCount = 0;

if (!empty($staleA)) {
    $issueCount++;
    echo "<div class='alert alert-err'>🔴 <b>BUG CỰC KỲ NGUY HIỂM:</b> " . count($staleA) . " items đang <code>processing</code> với <code>scheduled_at</code> trong tương lai → mỗi lần worker chạy sẽ reset wait timer của họ!
    <br>➡ Fix: <code>UPDATE subscriber_flow_states SET status='waiting' WHERE flow_id='$flowId' AND status='processing' AND scheduled_at > NOW()</code></div>";
}
if (!empty($waitResets)) {
    $issueCount++;
    echo "<div class='alert alert-err'>🔴 <b>WAIT ĐÃ BỊ RESET:</b> " . count($waitResets) . " trường hợp wait_processed > 1 lần. Người đã bị ảnh hưởng cần xem lại scheduled_at hiện tại.</div>";
}
if (!empty($inconsistencies)) {
    $issueCount++;
    echo "<div class='alert alert-warn'>🟡 <b>STEP INCONSISTENCY:</b> " . count($inconsistencies) . " subscribers đang ở step không khớp với activity history.</div>";
}
if (!empty($dupes)) {
    $issueCount++;
    echo "<div class='alert alert-warn'>🟡 <b>DUPLICATE ENROLLMENT:</b> " . count($dupes) . " subscribers được enroll nhiều hơn 1 lần.</div>";
}
if (!empty($skipIssues)) {
    $issueCount++;
    echo "<div class='alert alert-warn'>🟡 <b>STEP SKIP:</b> " . count(array_unique(array_column($skipIssues, 'subscriber_id'))) . " subscribers hoàn thành flow mà không đi qua đủ bước.</div>";
}
if ($issueCount === 0) {
    echo "<div class='alert alert-ok'>✅ Không phát hiện vấn đề nghiêm trọng.</div>";
} else {
    echo "<div class='alert alert-info'>ℹ️ Tổng: <b>$issueCount loại vấn đề</b> được phát hiện. Xem chi tiết từng section phía trên.</div>";
}
echo "</div></div>";

echo "<div class='meta' style='margin-top:20px'>Generated: " . date('Y-m-d H:i:s') . " | <a href='?flow_id=$flowId&limit=$limit'>Reload</a> | <a href='?flow_id=$flowId&limit=500'>More (500)</a></div>";
?>
</body>
</html>
