<?php
require_once 'db_connect.php';
$flowId = '69dca73f0d951';
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
$stmt = $pdo->prepare("UPDATE subscriber_flow_states SET status = 'completed', updated_at = NOW() WHERE flow_id = ? AND status = 'waiting' AND updated_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)");
$stmt->execute([$flowId]);
$res = $stmt->rowCount();
foreach ($keepWaitingEmails as $email) {
    $stmtSub = $pdo->prepare("SELECT id FROM subscribers WHERE email = ?");
    $stmtSub->execute([$email]);
    $sid = $stmtSub->fetchColumn();
    if ($sid) $pdo->prepare("UPDATE subscriber_flow_states SET status = 'waiting', updated_at = NOW() WHERE flow_id = ? AND subscriber_id = ?")->execute([$flowId, $sid]);
}
echo "Restored $res users to Completed. Set 8 targeted users to Waiting.";
?>
