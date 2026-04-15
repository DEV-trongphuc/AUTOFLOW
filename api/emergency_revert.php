<?php
require_once 'db_connect.php';
$flowId = '69dca73f0d951';

// Danh sách 8 ngu?i c?n GI? L?I ? tr?ng thái Waiting (theo danh sách b?n g?i)
$keepWaitingEmails = [
    'phamthiyentrang95@gmail.com',
    'tranngocquyen8@gmail.com',
    'lethanhtruc240399@gmail.com',
    'Thucphamchayhaibien@Email.com',
    'phamthanhhang567@gmail.com',
    'cao48667@gmail.com',
    'dangthithuphuong10011106@gmail.com',
    'phuhiepgia@gmail.com'
];

// 1. Chuy?n t?t c? 439 ngu?i v?a r?i quay l?i Completed
// (Nh?ng ngu?i v?a b? script tru?c c?p nh?t lúc ~01:05)
$stmt = $pdo->prepare("
    UPDATE subscriber_flow_states 
    SET status = 'completed', updated_at = NOW() 
    WHERE flow_id = ? AND status = 'waiting' AND updated_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
");
$stmt->execute([$flowId]);
$totalRestored = $stmt->rowCount();

// 2. Ðua RE-SET dúng 8 ngu?i m?c tiêu v? Waiting
foreach ($keepWaitingEmails as $email) {
    $stmtSub = $pdo->prepare("SELECT id FROM subscribers WHERE email = ?");
    $stmtSub->execute([$email]);
    $sid = $stmtSub->fetchColumn();
    
    if ($sid) {
        $pdo->prepare("UPDATE subscriber_flow_states SET status = 'waiting', updated_at = NOW() WHERE flow_id = ? AND subscriber_id = ?")->execute([$flowId, $sid]);
    }
}

echo "=== KHÔI PH?C KH?N C?P THÀNH CÔNG ===\n";
echo "1. Ðã dua $totalRestored ngu?i quay l?i tr?ng thái Completed (Ð? tránh g?i l?p).\n";
echo "2. Ðã gi? RIÊNG 8 ngu?i m?c tiêu ? tr?ng thái Waiting.\n";
?>
