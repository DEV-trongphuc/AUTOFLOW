<?php
require_once 'db_connect.php';
$flowId = '69dca73f0d951';

// L?y 20 ngu?i hoàn thành s?m nh?t
$stmt = $pdo->prepare("
    SELECT sfs.id, sfs.subscriber_id, sfs.status, sfs.updated_at, s.email 
    FROM subscriber_flow_states sfs
    JOIN subscribers s ON sfs.subscriber_id = s.id
    WHERE sfs.flow_id = ? AND sfs.status = 'completed'
    ORDER BY sfs.updated_at ASC
    LIMIT 20
");
$stmt->execute([$flowId]);
$earliest = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "<h2>Ki?m tra 8 ngu?i b? l?t (Ghi nh?n Hoàn thành s?m nh?t)</h2>";
echo "<table border='1' cellpadding='10' style='border-collapse: collapse;'>";
echo "<tr style='background:#eee'><th>Email</th><th>Hoàn thành lúc</th><th>Tr?ng thái khác hi?n có?</th><th>Hành d?ng d? xu?t</th></tr>";

foreach ($earliest as $row) {
    // Ki?m tra xem ngu?i này có b?n ghi nào KHÁC (ví d? dang ? Wait) không
    $stmt2 = $pdo->prepare("SELECT status, step_id FROM subscriber_flow_states WHERE flow_id = ? AND subscriber_id = ? AND id != ?");
    $stmt2->execute([$flowId, $row['subscriber_id'], $row['id']]);
    $other = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    
    $otherText = count($other) > 0 ? "CÓ: " . $other[0]['status'] : "Không (Duy nh?t)";
    
    echo "<tr>";
    echo "<td><b>{$row['email']}</b></td>";
    echo "<td>{$row['updated_at']}</td>";
    echo "<td>{$otherText}</td>";
    
    if (count($other) > 0) {
        echo "<td><a href='?action=delete&id={$row['id']}' style='color:red'>XÓA B?N GHI COMPLETED DU</a></td>";
    } else {
        echo "<td><a href='?action=reset&id={$row['id']}' style='color:blue'>Chuy?n v? Waiting (Gi? l?i)</a></td>";
    }
    echo "</tr>";
}
echo "</table>";

if (isset($_GET['action'])) {
    $id = $_GET['id'];
    if ($_GET['action'] === 'delete') {
        $pdo->prepare("DELETE FROM subscriber_flow_states WHERE id = ?")->execute([$id]);
        echo "<h3 style='color:red'>Ðã XÓA b?n ghi hoàn thành du th?a!</h3>";
    } elseif ($_GET['action'] === 'reset') {
        $pdo->prepare("UPDATE subscriber_flow_states SET status = 'waiting', updated_at = NOW() WHERE id = ?")->execute([$id]);
        echo "<h3 style='color:blue'>Ðã chuy?n v? Waiting!</h3>";
    }
}
?>
