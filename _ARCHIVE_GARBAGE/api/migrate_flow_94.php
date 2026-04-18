<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once __DIR__ . '/db_connect.php';
header('Content-Type: text/html; charset=utf-8');

$flowId = '69dca73f0d951';

// L?y d? li?u schema flow
$stmt = $pdo->prepare('SELECT steps FROM flows WHERE id = ?');
$stmt->execute([$flowId]);
$stepsJson = $stmt->fetchColumn();
$steps = json_decode($stepsJson, true);

if (!$steps) die("Không tìm th?y steps c?a flow!");

$stepMap = [];
foreach ($steps as $index => $step) {
    $stepMap[$step['id']] = $step;
}

$stepCompletedWaitId = '668930db-7bb5-4e43-87f2-7ae3e2131a4a'; // "Ch? d?n ngày 2026-04-16 20:00"

echo "<h2>?? EMERGENCY FIX: SETUP L?I NGÀY GI? CHO NODE CH? (KHÔNG B? QUA HOUR)</h2>";
echo "<div style='background:#fff3cc; padding:15px; border:1px solid #ffd400; font-family:sans-serif;'>";

// Tính toán th?i gian d?i th?c t? c?a Node Wait
$targetWaitNodeId = $stepCompletedWaitId;
$fsWaitConfig = $stepMap[$targetWaitNodeId]['config'] ?? [];
$fsWaitMode = $fsWaitConfig['mode'] ?? 'duration';

$initialSchedule = '2026-04-16 20:00:00'; // Fallback tinh cho an toàn nh?t
if ($fsWaitMode === 'until_date') {
    $specDate = $fsWaitConfig['specificDate'] ?? '';
    $targetTime = $fsWaitConfig['untilTime'] ?? '09:00';
    if ($specDate) {
        $targetTs = strtotime("$specDate $targetTime:00");
        if ($targetTs > time()) {
            $initialSchedule = date('Y-m-d H:i:s', $targetTs);
        }
    }
}

echo "• Phát hi?n Node Ðích: <b>" . ($stepMap[$targetWaitNodeId]['label'] ?? 'Unknown Node') . "</b><br>";
echo "• Th?i gian ch? c?u hình g?c trên h? th?ng: <b style='color:red'>$initialSchedule</b><br><br>";

if (isset($_POST['do_fix'])) {
    // Ch? fix nh?ng ngu?i có scheduled_at không bình thu?ng (b? l?nh tru?c là NOW()) ho?c c?n reset
    $u2 = $pdo->prepare("UPDATE subscriber_flow_states SET scheduled_at = ? WHERE flow_id = ? AND step_id = ? AND status = 'waiting'");
    $u2->execute([$initialSchedule, $flowId, $stepCompletedWaitId]);
    echo "<div style='padding:15px; background:#dff0d8; color:#3c763d; border:1px solid #d6e9c6;'>";
    echo "? <b>Emergency Fix:</b> Ðã khôi ph?c thành công l?ch g?i th?c t? ($initialSchedule) cho <b>" . $u2->rowCount() . "</b> ngu?i t?i Node này!<br>";
    echo "H? s? du?c ch? dúng vành dai th?i gian c?a c?u hình Flow ch? không b? g?i d?n di ngay l?p t?c. L?i logic do tôi thi?t l?p sai bi?n ? phiên b?n tool Migrate v1 dã du?c g? b? hoàn toàn.";
    echo "</div>";
} else {
    echo "<form method='POST' action=''>";
    echo "<button type='submit' name='do_fix' value='1' style='padding:12px 24px; background:red; color:white; border:none; cursor:pointer; font-size:18px; font-weight:bold; border-radius:5px;'>? FIX L?I TH?I GIAN CH? CHO 1,600 NGU?I V? LÚC  NGAY!</button>";
    echo "</form>";
}
echo "</div>";
?>
