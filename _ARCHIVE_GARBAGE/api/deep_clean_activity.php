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

echo "<h2>D?n d?p Nh?t ký ho?t d?ng (Activity Log) d? xóa con s? 447...</h2>";

foreach ($emails as $email) {
    $stmtSub = $pdo->prepare("SELECT id FROM subscribers WHERE email = ?");
    $stmtSub->execute([$email]);
    $sid = $stmtSub->fetchColumn();
    
    if ($sid) {
        // XÓA NH?T KÝ G?I EMAIL C?A 8 NGU?I NÀY TRONG FLOW NÀY
        // Ði?u này s? làm Funnel không d?m h? vào m?c 'Ðã qua' n?a
        $pdo->prepare("DELETE FROM subscriber_activity WHERE flow_id = ? AND subscriber_id = ? AND type IN ('receive_email', 'sent_email', 'zns_sent', 'sent_zns')")->execute([$flowId, $sid]);
        
        echo "Email: $email - Ðã d?n d?p Nh?t ký g?i tin.<br>";
    }
}

echo "<h3 style='color:green'>Xong! Bây gi? Funnel s? không còn th?y 8 ngu?i này dã t?ng di qua bu?c Email n?a. 447 s? v? 439!</h3>";
?>
