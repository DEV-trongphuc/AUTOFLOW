<?php
// api/inspect_logs.php
require_once 'db_connect.php';

echo "<pre>--- INSPECTING LOGS FOR FLOW ad16ed97 --- \n";

try {
    $fid = 'ad16ed97-06b8-49a6-a8da-222c93191db0';

    // 1. Đếm tổng số log của Flow này theo từng loại
    $stmt = $pdo->prepare("SELECT type, COUNT(*) as c FROM subscriber_activity WHERE flow_id = ? GROUP BY type");
    $stmt->execute([$fid]);
    echo "LOGS BY TYPE for Flow $fid:\n";
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

    // 2. Kiểm tra xem có log nào của Flow này mà bị thiếu flow_id không (dựa trên reference_id)
    $stmt2 = $pdo->prepare("SELECT type, COUNT(*) as c FROM subscriber_activity WHERE (reference_id = '80966800-d4c1-4afd-9393-4290aceb9fc1' OR reference_id = 'd327fe62-c975-4bbe-bb3a-a352c409de86') AND (flow_id IS NULL OR flow_id = '') GROUP BY type");
    $stmt2->execute();
    echo "\nLOGS WITH MISSING flow_id (but matching step IDs):\n";
    print_r($stmt2->fetchAll(PDO::FETCH_ASSOC));

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
echo "</pre>";
