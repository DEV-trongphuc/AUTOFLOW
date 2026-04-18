<?php
require_once 'db_connect.php';
$flowId = '69dca73f0d951';
$emails = [
    'phamthiyentrang95@gmail.com',
    'tranngocquyen8@gmail.com',
    'lethanhtruc240399@gmail.com',
    'Thucphamchayhaibien@Email.com',
    'phamthanhhang567@gmail.com',
    'cao48667@gmail.com',
    'dangthithuphuong10011106@gmail.com',
    'phuhiepgia@gmail.com'
];

echo "<h2>Ðang x? lý d?n d?p d? li?u (Safe Mode)...</h2>";

foreach ($emails as $email) {
    $stmtSub = $pdo->prepare("SELECT id FROM subscribers WHERE email = ?");
    $stmtSub->execute([$email]);
    $sid = $stmtSub->fetchColumn();
    
    if ($sid) {
        // 1. Ki?m tra xem ngu?i này có bao nhiêu b?n ghi
        $stmtCheck = $pdo->prepare("SELECT id, status FROM subscriber_flow_states WHERE flow_id = ? AND subscriber_id = ?");
        $stmtCheck->execute([$flowId, $sid]);
        $records = $stmtCheck->fetchAll(PDO::FETCH_ASSOC);
        
        echo "Email: $email - Tìm th?y " . count($records) . " b?n ghi.<br>";
        
        $hasCompleted = false;
        foreach ($records as $r) {
            if ($r['status'] === 'completed') $hasCompleted = true;
        }
        
        if ($hasCompleted) {
            // N?u dã có Completed, xóa t?t c? các tr?ng thái khác (Waiting, Processing...)
            $pdo->prepare("DELETE FROM subscriber_flow_states WHERE flow_id = ? AND subscriber_id = ? AND status != 'completed'")->execute([$flowId, $sid]);
            echo " -> Ðã xóa b?n ghi du th?a, gi? l?i Completed.<br>";
        } else {
            // N?u chua có (ch? có Waiting), chuy?n b?n ghi duy nh?t dó thành Completed
            $pdo->prepare("UPDATE subscriber_flow_states SET status = 'completed', updated_at = NOW() WHERE flow_id = ? AND subscriber_id = ?")->execute([$flowId, $sid]);
            echo " -> Ðã chuy?n b?n ghi duy nh?t v? Completed.<br>";
        }
    }
}
echo "<h3 style='color:green'>HOÀN T?T! Con s? s? s?m c?p nh?t v? 439/439 trên Dashboard.</h3>";
?>
