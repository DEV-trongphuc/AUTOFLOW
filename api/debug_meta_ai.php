<?php
/**
 * api/debug_meta_ai.php
 * Script to debug Meta AI status for a specific user (PSID)
 */
require_once 'db_connect.php';

$psid = $_GET['psid'] ?? '';
$action = $_GET['action'] ?? '';

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>

<head>
    <title>Meta AI Debugger</title>
    <style>
        body {
            font-family: sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 20px auto;
            padding: 20px;
            background: #f4f7f6;
        }

        .card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
        }

        .status-ready {
            color: green;
            font-weight: bold;
        }

        .status-error {
            color: red;
            font-weight: bold;
        }

        .status-warning {
            color: orange;
            font-weight: bold;
        }

        pre {
            background: #eee;
            padding: 10px;
            overflow-x: auto;
            border-radius: 4px;
            font-size: 13px;
        }

        input[type="text"] {
            padding: 8px;
            width: 300px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }

        button {
            padding: 8px 16px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }

        button:hover {
            background: #0056b3;
        }

        .btn-reset {
            background: #dc3545;
        }
    </style>
</head>

<body>
    <h1>Meta AI Debugger</h1>

    <div class="card">
        <form method="GET">
            <p>Nhập Facebook PSID để kiểm tra:</p>
            <input type="text" name="psid" value="<?php echo htmlspecialchars($psid); ?>"
                placeholder="Ví dụ: 82347234234...">
            <button type="submit">Kiểm tra</button>
        </form>
    </div>

    <?php
    if ($psid) {
        // 1. Handle Actions
        if ($action === 'unpause') {
            $stmt = $pdo->prepare("UPDATE meta_subscribers SET ai_paused_until = NULL WHERE psid = ?");
            $stmt->execute([$psid]);
            echo "<div class='card' style='border-left: 5px solid green;'>✅ Đã Unpause AI cho PSID này!</div>";
        }

        // 2. Fetch Subscriber Data
        $stmtSub = $pdo->prepare("SELECT * FROM meta_subscribers WHERE psid = ?");
        $stmtSub->execute([$psid]);
        $sub = $stmtSub->fetch();

        if (!$sub) {
            echo "<div class='card status-error'>❌ Không tìm thấy Subscriber với PSID này trong Database.</div>";
        } else {
            $pageId = $sub['page_id'];

            // 3. Fetch Page Config
            $stmtConfig = $pdo->prepare("SELECT * FROM meta_app_configs WHERE page_id = ?");
            $stmtConfig->execute([$pageId]);
            $config = $stmtConfig->fetch();

            // 4. Fetch AI Scenarios
            $stmtScen = $pdo->prepare("SELECT * FROM meta_automation_scenarios WHERE meta_config_id = ? AND type = 'ai_reply' AND status = 'active'");
            $stmtScen->execute([$config['id'] ?? 0]);
            $scenarios = $stmtScen->fetchAll();

            $isPaused = ($sub['ai_paused_until'] && strtotime($sub['ai_paused_until']) > time());
            ?>

            <div class="card">
                <h3>1. Trạng thái AI (AI Status)</h3>
                <?php if ($isPaused): ?>
                    <p class="status-warning">⚠️ AI đang bị TẠM DỪNG (Paused)</p>
                    <p>Lý do: Nhân viên vừa trả lời hoặc bị Pause thủ công.</p>
                    <p>Dừng đến: <b>
                            <?php echo $sub['ai_paused_until']; ?>
                        </b></p>
                    <a href="?psid=<?php echo $psid; ?>&action=unpause"><button class="btn-reset">Kích hoạt lại AI ngay lập tức
                            (Unpause)</button></a>
                <?php else: ?>
                    <p class="status-ready">✅ AI đang SẴN SÀNG (Active)</p>
                <?php endif; ?>
            </div>

            <div class="card">
                <h3>2. Cấu hình Page (Meta Config)</h3>
                <?php if ($config): ?>
                    <p>Page Name: <b>
                            <?php echo htmlspecialchars($config['page_name']); ?>
                        </b></p>
                    <p>Page ID: <code><?php echo htmlspecialchars($config['page_id']); ?></code></p>
                    <p>Bot ID mặc định: <code><?php echo htmlspecialchars($config['chatbot_id'] ?? 'Chưa cài'); ?></code></p>
                <?php else: ?>
                    <p class="status-error">❌ Page này chưa được cấu hình trong meta_app_configs!</p>
                <?php endif; ?>
            </div>

            <div class="card">
                <h3>3. Kịch bản AI (Automation Scenarios)</h3>
                <?php if (count($scenarios) > 0): ?>
                    <p>Tìm thấy <b>
                            <?php echo count($scenarios); ?>
                        </b> kịch bản AI Reply đang chạy:</p>
                    <ul>
                        <?php foreach ($scenarios as $s): ?>
                            <li>
                                <b>
                                    <?php echo htmlspecialchars($s['title']); ?>
                                </b>
                                (ID Bot: <code><?php echo $s['ai_chatbot_id']; ?></code>)
                                - Trạng thái:
                                <?php echo $s['status']; ?>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                <?php else: ?>
                    <p class="status-error">❌ Không tìm thấy kịch bản AI_REPLY nào đang bật cho Page này!</p>
                    <p><i>Hãy vào phần Automation -> Meta -> Thêm kịch bản AI Reply.</i></p>
                <?php endif; ?>
            </div>

            <div class="card">
                <h3>4. Thông tin thô (Raw Subscriber Data)</h3>
                <pre><?php print_r($sub); ?></pre>
            </div>

            <div class="card">
                <h3>5. Lịch sử Log gần nhất (Gợi ý)</h3>
                <p>Mẹo: Kiểm tra file <code>api/meta_debug.log</code> để xem tiến trình gọi AI cho PSID này.</p>
            </div>
            <?php
        }
    } else {
        ?>
        <div class="card">
            <p>Vui lòng nhập PSID để bắt đầu. Bạn có thể tìm PSID bằng cách nhắn tin vào Page và vào database bảng
                <code>meta_subscribers</code> xem bản ghi mới nhất.</p>
        </div>
        <?php
    }
    ?>
</body>

</html>