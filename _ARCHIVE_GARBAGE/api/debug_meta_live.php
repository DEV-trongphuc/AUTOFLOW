<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header("Content-Type: text/html; charset=UTF-8");

require_once 'db_connect.php';

echo "<html><head><title>Meta AI Debugger (Trực Tiếp)</title>";
echo "<style>
    body { font-family: Arial, sans-serif; background: #fdfdfd; padding: 20px; font-size: 14px; }
    h2 { color: #d35400; border-bottom: 2px solid #eee; padding-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
    th { background-color: #34495e; color: #fff; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .sender-visitor { color: #2980b9; font-weight: bold; }
    .sender-ai { color: #27ae60; font-weight: bold; }
    .alert { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; font-weight: bold; margin-bottom: 20px; }
    .info { background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
</style>";
echo "</head><body>";

echo "<h1>🛠 Meta AI Live Debugger</h1>";
echo "<div class='info'>Sử dụng script này để check xem AI có nhận được tin từ FB không, và tại sao nó không rep.</div>";

// 1. KIỂM TRA TRẠNG THÁI PAUSE (HUMAN TAKEOVER)
echo "<h2>1. Trạng Thái AI (Bị Tắt Do Human Takeover?)</h2>";
try {
    $stmt = $pdo->query("SELECT psid, page_id, first_name, ai_paused_until FROM meta_subscribers WHERE ai_paused_until > NOW() ORDER BY ai_paused_until DESC LIMIT 10");
    $paused = $stmt->fetchAll();
    if($paused) {
        echo "<div class='alert'>🚨 CẢNH BÁO: Có khách hàng đang bị TẮT AI (Bot sẽ không rep những người này cho đến khi hết hạn)!</div>";
        echo "<table><tr><th>Tên KH (PSID)</th><th>Fanpage ID</th><th>Bị Tắt Đến Thời Gian Lần</th></tr>";
        foreach($paused as $p) {
            echo "<tr><td>{$p['first_name']} ({$p['psid']})</td><td>{$p['page_id']}</td><td><b style='color:red;'>{$p['ai_paused_until']}</b></td></tr>";
        }
        echo "</table>";
    } else {
        echo "<p>✅ Không có khách hàng nào đang bị PAUSE AI.</p>";
    }
} catch (Exception $e) { echo "Lỗi truy vấn: " . $e->getMessage(); }


// 2. LOG TIN NHẮN TỪ FACEBOOK GỬI VÀO (Lấy trực tiếp từ database hội thoại ai_messages)
echo "<h2>2. Lịch Sử Chat Thực Tế (Bao gồm cả Khách & Bot nhắn)</h2>";
try {
    $sql = "
        SELECT m.sender, m.message, m.created_at, c.visitor_id, c.property_id
        FROM ai_messages m
        JOIN ai_conversations c ON m.conversation_id = c.id
        WHERE c.visitor_id LIKE 'meta_%'
        ORDER BY m.id DESC LIMIT 40
    ";
    $stmt = $pdo->query($sql);
    $messages = $stmt->fetchAll();

    if ($messages) {
        echo "<table><tr><th>Thời Gian</th><th>Ai Nhắn?</th><th>Nội Dung</th><th>Visitor ID (PSID)</th></tr>";
        foreach ($messages as $m) {
            $senderClass = $m['sender'] === 'visitor' ? 'sender-visitor' : 'sender-ai';
            $senderName = $m['sender'] === 'visitor' ? '👤 Khách (Facebook)' : '🤖 Bot AI';
            echo "<tr>";
            echo "<td>{$m['created_at']}</td>";
            echo "<td class='$senderClass'>$senderName</td>";
            echo "<td>" . nl2br(htmlspecialchars($m['message'])) . "</td>";
            echo "<td>{$m['visitor_id']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<div class='alert'>❌ KHÔNG TÌM THẤY BẤT KỲ TIN NHẮN NÀO TỪ FACEBOOK TRONG DATABASE! <br><br>Nếu bạn vừa nhắn mà ở đây trống rỗng, nghĩa là Webhook Facebook KHÔNG HỀ BAY VÀO SERVER NÀY. (Bạn đang test trên Localhost mà Webhook Facebook lại chỉ vào IP/Domain Live Server, hoặc bạn quên cấu hình Ngrok).</div>";
    }
} catch (Exception $e) { echo "Lỗi truy vấn: " . $e->getMessage(); }

// 3. KIỂM TRA HÀNG ĐỢI WEBHOOK (QUEUE) CÓ BỊ KẸT KHÔNG?
echo "<h2>3. Tiến Trình Webhook Hàng Đợi (Queue Jobs)</h2>";
try {
    $stmt = $pdo->query("SELECT id, status, available_at, payload FROM queue_jobs WHERE queue = 'meta_inbound' ORDER BY id DESC LIMIT 5");
    $jobs = $stmt->fetchAll();
    if($jobs) {
        echo "<table><tr><th>Queue ID</th><th>Trạng Thái</th><th>Payload Bắn Vào</th><th>Ngày Nhận</th></tr>";
        foreach($jobs as $j) {
            $color = $j['status'] === 'failed' ? 'red' : ($j['status'] === 'pending' ? 'orange' : 'green');
            echo "<tr><td>{$j['id']}</td><td style='color:$color; font-weight:bold;'>{$j['status']}</td><td>" . substr($j['payload'], 0, 100) . "...</td><td>{$j['available_at']}</td></tr>";
        }
        echo "</table>";
    } else {
        echo "<p>✅ Hàng đợi webhook trống (Không bị kẹt).</p>";
    }
} catch(Exception $e) { echo "Lỗi truy vấn: " . $e->getMessage(); }

// 4. KIỂM TRA SCENARIO (CẤU HÌNH BOT AI)
echo "<h2>4. Kịch Bản Sinh Ra Lỗi (Chẩn đoán Active Days)</h2>";
try {
    $stmt = $pdo->query("SELECT id, status, schedule_type, active_days, trigger_text FROM meta_automation_scenarios WHERE type = 'ai_reply' ORDER BY updated_at DESC LIMIT 5");
    $scenarios = $stmt->fetchAll();
    if($scenarios) {
        echo "<table><tr><th>Scenario ID</th><th>Trạng Thái</th><th>Loại Lịch</th><th>Dữ Liệu Ngày (JSON)</th><th>Trigger Text</th></tr>";
        foreach($scenarios as $s) {
            $isCorrupted = (strpos($s['active_days'], '\"') !== false || strpos($s['active_days'], '\\') !== false) ? "<b style='color:red;'>[BỊ HỎNG]</b>" : "<b style='color:green;'>[BÌNH THƯỜNG]</b>";
            echo "<tr>
                    <td>{$s['id']}</td>
                    <td>{$s['status']}</td>
                    <td>{$s['schedule_type']}</td>
                    <td>{$s['active_days']} <br> $isCorrupted</td>
                    <td>" . ($s['trigger_text'] === '' ? '<i>(Rỗng - Rep mọi tin)</i>' : $s['trigger_text']) . "</td>
                  </tr>";
        }
        echo "</table>";
    }
} catch(Exception $e) { echo "Lỗi truy vấn: " . $e->getMessage(); }

echo "</body></html>";
?>
