<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';

$flowId = '69dca73f0d951';

// L?y thông tin 8 ngu?i chua hoàn thành
$stmt = $pdo->prepare("
    SELECT 
        sfs.status, 
        sfs.step_id, 
        sfs.updated_at, 
        s.email,
        (SELECT type FROM subscriber_activity WHERE subscriber_id = sfs.subscriber_id AND flow_id = sfs.flow_id ORDER BY created_at DESC LIMIT 1) as last_type,
        (SELECT details FROM subscriber_activity WHERE subscriber_id = sfs.subscriber_id AND flow_id = sfs.flow_id ORDER BY created_at DESC LIMIT 1) as last_details
    FROM subscriber_flow_states sfs
    JOIN subscribers s ON sfs.subscriber_id = s.id
    WHERE sfs.flow_id = ? AND sfs.status != 'completed'
");
$stmt->execute([$flowId]);
$all = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "<h2>Danh sách 8 ngu?i chua hoàn thành Flow $flowId</h2>";
echo "<table border='1' cellpadding='10' style='border-collapse: collapse; font-family: sans-serif; font-size: 13px;'>";
echo "<tr style='background: #f4f4f4;'><th>Email</th><th>Tr?ng thái</th><th>Bu?c hi?n t?i</th><th>Hành d?ng cu?i</th><th>Chi ti?t / L?i</th><th>C?p nh?t lúc</th></tr>";

foreach ($all as $row) {
    echo "<tr>";
    echo "<td><b>{$row['email']}</b></td>";
    echo "<td>{$row['status']}</td>";
    echo "<td>{$row['step_id']}</td>";
    echo "<td>{$row['last_type']}</td>";
    echo "<td><small>{$row['last_details']}</small></td>";
    echo "<td>{$row['updated_at']}</td>";
    echo "</tr>";
}
echo "</table>";

echo "<br><br><a href='fix_stuck_leaf.php' style='padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;'>B?m vào dây d? Hoàn thành (Fix 8 ngu?i này)</a>";
