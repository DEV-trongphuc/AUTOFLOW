<?php
require_once 'db_connect.php';
$flowId = '69dca73f0d951';

// 1. Tìm các subscriber có t? 2 b?n ghi tr? lên trong cùng 1 flow
$stmt = $pdo->prepare("
    SELECT subscriber_id, count(*) as count 
    FROM subscriber_flow_states 
    WHERE flow_id = ? 
    GROUP BY subscriber_id 
    HAVING count > 1
");
$stmt->execute([$flowId]);
$dupes = $stmt->fetchAll(PDO::FETCH_ASSOC);

$deletedCount = 0;
$resetCount = 0;

foreach ($dupes as $dupe) {
    $subId = $dupe['subscriber_id'];
    
    // Tìm b?n ghi 'completed' cu nh?t c?a ngu?i này
    $stmtComp = $pdo->prepare("
        SELECT id FROM subscriber_flow_states 
        WHERE flow_id = ? AND subscriber_id = ? AND status = 'completed'
        ORDER BY updated_at ASC LIMIT 1
    ");
    $stmtComp->execute([$flowId, $subId]);
    $compId = $stmtComp->fetchColumn();
    
    if ($compId) {
        // Xóa b?n ghi completed du th?a
        $pdo->prepare("DELETE FROM subscriber_flow_states WHERE id = ?")->execute([$compId]);
        $deletedCount++;
    }
}

// 2. Bonus: Tìm nh?ng ngu?i hoàn thành vào lúc '00:22' nhung CH? CÓ 1 b?n ghi (có th? chua du?c c?u)
// Chúng ta s? chuy?n h? v? Waiting n?u h? hoàn thành quá nhanh do l?i
$stmtSingle = $pdo->prepare("
    SELECT id FROM subscriber_flow_states 
    WHERE flow_id = ? AND status = 'completed' 
    AND updated_at BETWEEN '2026-04-15 00:20:00' AND '2026-04-15 00:30:00'
");
$stmtSingle->execute([$flowId]);
$singles = $stmtSingle->fetchAll(PDO::FETCH_ASSOC);

foreach ($singles as $s) {
    // Ch? reset n?u h? th?c s? ch? còn 1 b?n ghi (sau khi dã xóa bu?c 1)
    $stmtCheck = $pdo->prepare("SELECT count(*) FROM subscriber_flow_states WHERE flow_id = ? AND id = ?");
    $stmtCheck->execute([$flowId, $s['id']]);
    if ($stmtCheck->fetchColumn() > 0) {
        $pdo->prepare("UPDATE subscriber_flow_states SET status = 'waiting', updated_at = NOW() WHERE id = ?")->execute([$s['id']]);
        $resetCount++;
    }
}

echo "=== K?T QU? D?N D?P ===\n";
echo "1. Ðã xóa b?n ghi Completed trùng l?p: $deletedCount ngu?i.\n";
echo "2. Ðã chuy?n tr?ng thái Completed l?i v? Waiting: $resetCount ngu?i.\n";
echo "T?ng c?ng dã x? lý xong cho các tru?ng h?p vu?ng l?i lúc 00:22.\n";
?>
