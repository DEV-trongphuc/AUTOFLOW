<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once __DIR__ . '/db_connect.php';
header('Content-Type: text/html; charset=utf-8');

$flowId = '69dca73f0d951';

// C? d?nh Node ID cho an toàn
$step2WaitId = '101a0edf-ab32-49b8-9735-f49ba3f0f3b8'; // Ch? 1 Ngày (92 ngu?i sáng mai)
$targetWaitNodeId = '668930db-7bb5-4e43-87f2-7ae3e2131a4a'; // Ch? d?n ngày 2026-04-16 20:00
$targetDate = '2026-04-16 20:00:00';

if (isset($_POST['do_rescue'])) {
    // Chúng ta s? L?Y T?T C? nh?ng ngu?i dang b? k?t ? tr?ng thái Waiting ho?c Processing 
    // Ngo?i tr? 92 ngu?i ? Step 2 (Vì h? dã dè ngày dúng ? 15/04)
    $stmt = $pdo->prepare("
        UPDATE subscriber_flow_states 
        SET status = 'waiting', 
            step_id = ?, 
            scheduled_at = ?,
            updated_at = NOW()
        WHERE flow_id = ? 
          AND status IN ('waiting', 'processing')
          AND step_id != ?
    ");
    $stmt->execute([$targetWaitNodeId, $targetDate, $flowId, $step2WaitId]);

    echo "<div style='font-family:sans-serif; padding:15px; background:#dff0d8; border:1px solid #d6e9c6; color:#3c763d; font-size:18px;'>";
    echo "<h1>? GI?I C?U THÀNH CÔNG!</h1>";
    echo "Ðã quy t? và ch?t c?ng l?ch g?i cho <b>" . $stmt->rowCount() . "</b> ngu?i v? dúng Node <b>Ch? d?n 2026-04-16 20:00</b> v?i th?i gian ?n d?nh tuy?t d?i là <b>2026-04-16 20:00:00</b>.<br>";
    echo "S? không còn b?t k? ai l? b? quét tru?c nam 2026 n?a!";
    echo "</div>";
} else {
    // Ð?m gom nhóm tru?c khi x? lý
    $stmtW = $pdo->prepare("SELECT step_id, status, COUNT(*) as count FROM subscriber_flow_states WHERE flow_id = ? AND step_id != ? AND status IN ('waiting', 'processing') GROUP BY step_id, status");
    $stmtW->execute([$flowId, $step2WaitId]);
    $stats = $stmtW->fetchAll();
    
    $totalCount = 0;
    
    echo "<div style='font-family:sans-serif; padding:15px; background:#fff3cc; border:1px solid #ffd400;'>";
    echo "<h2>PH?M VI Ð?I TU?NG C?N RESCUE (TR? 92 NGU?I STEP 2 ÐÃ AN TOÀN)</h2>";
    echo "<ul>";
    foreach ($stats as $s) {
        $totalCount += $s['count'];
        echo "<li>Ðang k?t t?i Node: <code>" . $s['step_id'] . "</code> | Status: <b>" . $s['status'] . "</b> | S? lu?ng: <b>" . $s['count'] . "</b> ngu?i</li>";
    }
    echo "</ul>";
    echo "<h3>=> T?ng s? tài kho?n s? du?c kéo v? 20h 16/04/2026: <b style='color:red'>$totalCount</b></h3>";
    
    echo "<form method='POST' action=''>";
    echo "<button type='submit' name='do_rescue' value='1' style='padding:15px 30px; font-size:20px; font-weight:bold; background:red; color:white; border:none; border-radius:5px; cursor:pointer;'>? THI?T L?P L?I L? B?O M?T & ÐUA H? V? 2026-04-16 20:00 NGAY</button>";
    echo "</form>";
    echo "</div>";
}
?>
