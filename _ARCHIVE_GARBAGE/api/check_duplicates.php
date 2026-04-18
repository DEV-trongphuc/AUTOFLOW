<?php
// Tệp phân tích trùng lặp Campaign
require_once 'db_connect.php';

$cid = $_GET['id'] ?? '69e1b5ca64e94';

echo "<h2>BÁO CÁO PHÂN TÍCH CHIẾN DỊCH: $cid</h2>";
echo "<hr>";

try {
    // 1. Đếm tổng số người THỰC TẾ đã nhận được email (Unique Subscribers)
    $stmt1 = $pdo->prepare("
        SELECT COUNT(DISTINCT subscriber_id) 
        FROM subscriber_activity 
        WHERE campaign_id = ? AND type IN ('receive_email', 'zalo_sent', 'zns_sent', 'failed_email')
    ");
    $stmt1->execute([$cid]);
    $uniqueReached = $stmt1->fetchColumn();
    
    // 2. Đếm tổng số lượng Log hiện có của chiến dịch này
    $stmtTotal = $pdo->prepare("
        SELECT COUNT(*) 
        FROM subscriber_activity 
        WHERE campaign_id = ? AND type IN ('receive_email', 'zalo_sent', 'zns_sent', 'failed_email')
    ");
    $stmtTotal->execute([$cid]);
    $totalLogs = $stmtTotal->fetchColumn();

    echo "<h3>📊 Tổng quan Độ Nét:</h3>";
    echo "<ul>";
    echo "<li>Mục tiêu ban đầu: <b>5,995</b> khách hàng</li>";
    echo "<li>Thực tế đã lọt tới: <b>$uniqueReached</b> khách hàng (Unique)</li>";
    echo "<li>Tổng số mail bay ra (bao gồm lặp): <b>$totalLogs</b> vệt log</li>";
    echo "</ul>";

    if ($uniqueReached >= 5995) {
        echo "<p style='color: green;'>✅ Tin vui: Toàn bộ 100% mục tiêu (5995 người) đều đã nhận được ít nhất 1 email. Không bị sót ai cả!</p>";
    } else {
        echo "<p style='color: orange;'>⚠️ Vẫn còn sót " . (5995 - $uniqueReached) . " người chưa được gửi tới trước khi bị cúp cầu dao.</p>";
    }

    echo "<hr>";

    // 3. Phân tích số người bị Duplicates
    $stmt2 = $pdo->prepare("
        SELECT sa.subscriber_id, s.email, COUNT(*) as send_count 
        FROM subscriber_activity sa
        LEFT JOIN subscribers s ON sa.subscriber_id = s.id
        WHERE sa.campaign_id = ? AND sa.type IN ('receive_email', 'zalo_sent', 'zns_sent')
        GROUP BY sa.subscriber_id 
        HAVING send_count > 1 
        ORDER BY send_count DESC
    ");
    $stmt2->execute([$cid]);
    $duplicates = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    echo "<h3>🚨 Báo cáo những người bị nhận đúp (Tổng cộng: ".count($duplicates)." người bị đúp)</h3>";
    
    if (count($duplicates) == 0) {
        echo "<p style='color: green;'>Thật kỳ diệu, không có ai bị nhận đúp! (Sự sai lệch số liệu có thể do biến Count_sent bị cộng dồn sai chứ hệ thống không gửi đúp).</p>";
    } else {
        echo "<table border='1' cellpadding='8' style='border-collapse: collapse; width: 100%; max-width: 600px; text-align: left;'>";
        echo "<tr style='background: #f1f5f9;'><th>Email / ID</th><th>Số phát nhận đúp</th></tr>";
        $i = 0;
        foreach ($duplicates as $dup) {
            $i++;
            if ($i > 500) {
                echo "<tr><td colspan='2'>... và ". (count($duplicates) - 500) ." người khác</td></tr>";
                break;
            }
            $email = $dup['email'] ? $dup['email'] : "ID Kẻ Vô Danh: " . $dup['subscriber_id'];
            echo "<tr>";
            echo "<td>" . htmlspecialchars($email) . "</td>";
            echo "<td style='color: red; font-weight: bold;'>" . $dup['send_count'] . " lần</td>";
            echo "</tr>";
        }
        echo "</table>";
    }

} catch (Exception $e) {
    echo "Lỗi truy vấn Database: " . $e->getMessage();
}
?>
