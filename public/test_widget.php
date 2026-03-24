<?php
// public/test_widget.php
require_once '../api/db_connect.php';
// Lấy 1 chatbot đang active để test (hoặc bất kỳ chatbot nào nếu không có cái nào active)
$stmt = $pdo->query("SELECT id FROM ai_chatbots WHERE is_active = 1 LIMIT 1");
$bot = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$bot) {
    $stmt = $pdo->query("SELECT id FROM ai_chatbots LIMIT 1");
    $bot = $stmt->fetch(PDO::FETCH_ASSOC);
}
$property_id = $bot ? $bot['id'] : '';
if (!$property_id) {
    echo "<div style='color:red; font-weight:bold; padding:20px; border:2px solid red;'>[ERROR] Không tìm thấy bất kỳ Property ID nào trong bảng ai_chatbots. Hãy tạo chatbot trước.</div>";
}
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Chat Streaming Test</title>
    <style>
        body {
            font-family: sans-serif;
            background: #f8fafc;
            height: 100vh;
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        .info {
            text-align: center;
            max-width: 600px;
            padding: 20px;
        }

        h1 {
            color: #1e293b;
            margin-bottom: 10px;
        }

        p {
            color: #64748b;
            line-height: 1.6;
        }

        .badge {
            background: #3b82f6;
            color: white;
            padding: 4px 12px;
            border-radius: 99px;
            font-weight: bold;
            font-size: 14px;
        }
    </style>
</head>

<body>
    <script>
        window._mf_config = {
            property_id: '<?php echo $property_id; ?>',
            endpoint: '../api/ai_chatbot.php',
            is_test: true
        };
        console.log("[TEST] Widget config:", window._mf_config);
    </script>

    <div class="info">
        <h1>AI Streaming & TTS Max Speed ⚡</h1>
        <p>Widget này đã được tối ưu hóa: <br>
            1. <b>Streaming AI</b>: Trả lời từng chữ ngay lập tức. <br>
            2. <b>Incremental TTS</b>: Đọc câu đầu tiên ngay khi AI mới nói xong 1 câu, không đợi hết đoạn.
        </p>
        <div class="badge">Property ID:
            <?php echo $property_id; ?>
        </div>
    </div>

    <!-- AI Chatbot Embedded Script -->
    <script id="mf-chatbot-script" src="ai-chat-embedded.js" defer>
    </script>
</body>

</html>