<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once __DIR__ . '/db_connect.php';
header('Content-Type: text/html; charset=utf-8');

$flowId = '69dca73f0d951';

// L?y thông tin steps
$stmt = $pdo->prepare('SELECT steps FROM flows WHERE id = ?');
$stmt->execute([$flowId]);
$stepsJson = $stmt->fetchColumn();
$steps = json_decode($stepsJson, true);

if (!$steps) die("Không tìm th?y steps c?a flow!");

$stepMap = [];
foreach ($steps as $step) {
    $stepMap[$step['id']] = $step;
}

echo "<h2>?? KI?M Ð?NH AN TOÀN FLOW 69dca73f0d951 TRU?C KHI REACTIVATE</h2>";
echo "<div style='font-family:sans-serif; padding:15px; background:#f4f4f4; border:1px solid #ccc; font-size:16px;'>";

// G?p nhóm theo Step và Scheduled_at (Tính t?i m?c gi?)
$stmtW = $pdo->prepare("
    SELECT step_id, status, DATE_FORMAT(scheduled_at, '%Y-%m-%d %H:00:00') as time_block, COUNT(*) as count 
    FROM subscriber_flow_states 
    WHERE flow_id = ? AND status = 'waiting'
    GROUP BY step_id, status, time_block
    ORDER BY time_block ASC
");
$stmtW->execute([$flowId]);
$allGroups = $stmtW->fetchAll();

$isSafe = true;

echo "<h3>Danh sách các m? Data dang 'Waiting' (Ch? l?nh):</h3><ul>";
if (empty($allGroups)) {
    echo "<li>Không có ai dang d?i!</li>";
}
foreach ($allGroups as $grp) {
    $nodeInfo = $stepMap[$grp['step_id']] ?? ['label' => 'Unknown Node'];
    $timeBlock = $grp['time_block'];
    
    // Ðánh giá r?i ro
    $warning = '';
    if (strtotime($timeBlock) <= time()) {
        $isSafe = false;
        $warning = " <b style='color:red;'>[NGUY HI?M: B? L? GI? G?I HO?C S? ÐU?C G?I NGAY!]</b>";
    }

    echo "<li>T?i Node <b>" . $nodeInfo['label'] . "</b> | Th?i gian ch?t g?i: <b style='color:blue'>" . $timeBlock . "</b> | S? Lu?ng: <b>" . $grp['count'] . "</b> ngu?i" . $warning . "</li>";
}
echo "</ul>";

echo "<hr>";
if ($isSafe) {
    echo "<h3 style='color:green;'>? TÌNH TR?NG: HOÀN TOÀN AN TOÀN Ð? ACTIVE!</h3>";
    echo "<p>Toàn b? ngu?i dang ch? d?i d?u du?c x?p l?ch phong ?n CHU?N XÁC VÀO TUONG LAI. N?u b?n b?t Nút Active Flow lên lúc này, Worker d?u có bang ngang qua cung s? <b>b? qua toàn b?</b> s? ngu?i này vì chua t?i ngày gi? ?n d?nh c?a h?!</p>";
} else {
    echo "<h3 style='color:red;'>? TÌNH TR?NG: CHUA AN TOÀN!</h3>";
    echo "<p>Ðang có ngu?i b? ghim l?ch nh? hon ho?c b?ng gi? hi?n t?i. N?u Active Flow, b?n h? s? b? dem di g?i l?p t?c!</p>";
}
echo "</div>";
?>
