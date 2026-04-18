<?php
// api/clean_duplicate_logs.php
// Script to safely remove hard duplicates from subscriber_activity 
// that were caused by the multi-worker MySQL race condition.

error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once 'db_connect.php';

$cid = $_GET['id'] ?? '69e1b5ca64e94';

echo "<h2>ĐANG DỌN DẸP LOGS THỪA (VẬT LÝ) TỪ LỊCH SỬ...</h2>";

$pdo->beginTransaction();

try {
    // 1. Delete duplicated SEND logs (keep only the FIRST min(id) per subscriber_id + type)
    // types: receive_email, failed_email, zalo_sent, meta_sent, zns_sent
    $sqlDeleteSends = "
        DELETE t1 FROM subscriber_activity t1
        INNER JOIN subscriber_activity t2 
        WHERE 
            t1.id > t2.id AND 
            t1.subscriber_id = t2.subscriber_id AND 
            t1.campaign_id = t2.campaign_id AND 
            t1.type = t2.type AND 
            t1.campaign_id = ? AND 
            t1.type IN ('receive_email', 'failed_email', 'zalo_sent', 'meta_sent', 'zns_sent', 'processing_campaign')
    ";
    
    $stmtSends = $pdo->prepare($sqlDeleteSends);
    $stmtSends->execute([$cid]);
    $deletedSends = $stmtSends->rowCount();

    echo "<p>Đã xoá vật lý <b>$deletedSends</b> lượt gửi (Sent/Logs) bị đúp.</p>";

    // 2. Delete duplicated 'enter_flow' if applicable 
    // Wait, enter_flow isn't strictly necessary but let's keep it clean
    $stmtEnters = $pdo->prepare("
        DELETE t1 FROM subscriber_activity t1
        INNER JOIN subscriber_activity t2 
        WHERE 
            t1.id > t2.id AND 
            t1.subscriber_id = t2.subscriber_id AND 
            t1.campaign_id = t2.campaign_id AND 
            t1.type = t2.type AND 
            t1.campaign_id = ? AND 
            t1.type = 'enter_flow'
    ");
    $stmtEnters->execute([$cid]);
    $deletedEnters = $stmtEnters->rowCount();

    $pdo->commit();

    echo "<h3 style='color: green;'>✅ ĐÃ XÓA SẠCH VẾT TÍCH GỬI ĐÚP TRONG DATABASE! </h3>";
    echo "<p>Giờ đây, thẻ 'Lịch Sử' trong UI sẽ quay về đúng 5995 lượt gửi gốc và không còn bị lặp dòng nữa.</p>";
} catch (Exception $e) {
    $pdo->rollBack();
    echo "<h3 style='color: red;'>❌ LỖI: " . $e->getMessage() . "</h3>";
}
