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

echo "<h2>D?n d?p tri?t d? con s? 447 v? 439...</h2>";

foreach ($emails as $email) {
    $stmtSub = $pdo->prepare("SELECT id FROM subscribers WHERE email = ?");
    $stmtSub->execute([$email]);
    $sid = $stmtSub->fetchColumn();
    
    if ($sid) {
        // TÌM VÀ XÓA T?T C? B?N GHI C?A NGU?I NÀY TRONG FLOW TR? B?N GHI COMPLETED DUY NH?T
        // Ði?u này d?m b?o h? ch? du?c tính 1 l?n duy nh?t trong toàn b? funnel
        $pdo->prepare("DELETE FROM subscriber_flow_states WHERE flow_id = ? AND subscriber_id = ? AND status != 'completed'")->execute([$flowId, $sid]);
        
        // Ð?m b?o b?n ghi Completed c?a h? có th?i gian c?p nh?t m?i nh?t
        $pdo->prepare("UPDATE subscriber_flow_states SET updated_at = NOW() WHERE flow_id = ? AND subscriber_id = ? AND status = 'completed'")->execute([$flowId, $sid]);
        
        echo "Email: $email - Ðã d?n d?p s?ch b?n ghi th?a.<br>";
    }
}

echo "<h3 style='color:green'>Xong! Con s? 447 s? s?m quay v? 439 trên Dashboard.</h3>";
?>
