<?php
// api/ai_chatbot.php – FINAL REFACTORED ORCHESTRATOR (v3.5 - DRY & Performance Optimized)
require_once 'db_connect.php';
require_once 'chat_helpers.php';
require_once 'chat_security.php';
require_once 'chat_rag.php';
require_once 'chat_gemini.php';
require_once 'chat_logic_fast.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS')
    exit;

const API_VERSION = '3.5';
$GLOBAL_GEMINI_KEY = getenv('GEMINI_API_KEY') ?: '';

// --- HELPER: Settings Cache with File Locking & Safe Decode ---
function getSettingsCached($pdo, $propertyId, $globalKey)
{
    $cacheDir = __DIR__ . "/cache";
    if (!is_dir($cacheDir))
        mkdir($cacheDir, 0777, true);
    $cacheFile = "$cacheDir/settings_{$propertyId}.json";

    if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < 300)) {
        $content = @file_get_contents($cacheFile);
        if ($content) {
            $data = json_decode($content, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($data)) {
                return $data;
            }
        }
    }

    $stmt = $pdo->prepare("SELECT * FROM ai_chatbot_settings WHERE property_id = ? LIMIT 1");
    $stmt->execute([$propertyId]);
    $settings = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$settings) {
        $settings = [
            'property_id' => $propertyId,
            'is_enabled' => 1,
            'bot_name' => 'AI Consultant',
            'brand_color' => '##111729',
            'company_name' => 'MailFlow Pro',
            'chunk_size' => 500,
            'chunk_overlap' => 100,
            'history_limit' => 10,
            'similarity_threshold' => 0.45,
            'top_k' => 12
        ];
    }

    // Use LOCK_EX to prevent race conditions during write
    @file_put_contents($cacheFile, json_encode($settings), LOCK_EX);
    return $settings;
}

// --- HELPER: Build System Prompt (Shared Logic) ---
function buildSystemPrompt($settings, $activityContext, $relevantContext, $isIdentified, $currentPage)
{
    $userCustomTone = $settings['system_instruction'] ?? "Bạn là tư vấn viên chuyên nghiệp. Xưng em, gọi khách anh/chị. Không emoji.";
    $botName = $settings['bot_name'] ?? 'AI Consultant';
    $companyName = $settings['company_name'] ?? 'Công ty';
    $today = date("d/m/Y");

    return <<<PROMPT
$userCustomTone

DẠNG THỨC: Bạn là $botName - Chuyên viên tư vấn của $companyName. 
PHONG CÁCH:
- Tuyệt đối tránh các cụm từ máy móc như "Dựa trên tài liệu", "Tôi là AI". Hãy trả lời ngay như một người đang trực chat.

## NGỮ CẢNH HÀNH TRÌNH KHÁCH:
$activityContext

## Knowledge Base:
_
$relevantContext
_

##BẮT BUỘC !IMPORTANT:
1. TRẢ LỜI CHÍNH XÁC: Xem kỹ thông tin trong Knowledge Base. Tuyệt đối không tự bịa thông tin. 
2. XỬ LÝ KHI THIẾU THÔNG TIN: Nếu không có dữ liệu trong Knowledge Base/ bí tư vấn hãy nói khéo léo: "Dạ, hiện tại em chưa có thông tin chi tiết về phần này để tư vấn chính xác cho mình. Anh/Chị vui lòng để lại Email hoặc Số điện thoại, tư vấn viên bên em sẽ kiểm tra kỹ và gọi lại hỗ trợ mình ngay nhé! [SHOW_LEAD_FORM]".
3. CHECK LỊCH SỬ: Nếu khách hỏi câu hỏi ngắn, phải hiểu họ đang nói về chủ đề vừa đề cập.
4. HÀNH ĐỘNG: Nếu có nhiều hơn 3 ý/liệt kê/danh sách môn phải gạch đầu dòng -. Gợi ý bước tiếp theo phù hợp: [ACTIONS: Gợi ý 1 | Gợi ý 2], 
5. THỜI GIAN: Hôm nay là ngày $today.
6. Khách đang xem trang ({$currentPage})

PROMPT;
}
try {
    // ---------------------------------------------------------
    // GET REQUESTS (Admin & Init)
    // ---------------------------------------------------------
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_GET['action'] ?? '';
        $propertyId = $_GET['property_id'] ?? null;

        if ($action === 'get_settings' && $propertyId) {
            $settings = getSettingsCached($pdo, $propertyId, $GLOBAL_GEMINI_KEY);
            // Dynamic Welcome Message Logic
            if ($visitorId = $_GET['visitor_id'] ?? null) {
                $stmtVis = $pdo->prepare("SELECT v.visit_count, v.email, s.first_name FROM web_visitors v LEFT JOIN subscribers s ON v.subscriber_id = s.id WHERE v.id = ?");
                $stmtVis->execute([$visitorId]);
                $vis = $stmtVis->fetch(PDO::FETCH_ASSOC);
                if ($vis && $vis['visit_count'] > 1) {
                    $name = $vis['first_name'] ?: ($vis['email'] ? explode('@', $vis['email'])[0] : null);
                    if ($name)
                        $settings['welcome_msg'] = "Chào mừng Anh/Chị $name quay trở lại! Em có thể hỗ trợ gì thêm cho mình không ạ?";
                }
            }
            echo json_encode(['success' => true, 'version' => API_VERSION, 'data' => $settings]);
            exit;
        }

        if ($action === 'list_conversations' && $propertyId) {
            $page = (int) ($_GET['page'] ?? 1);
            $limit = (int) ($_GET['limit'] ?? 20);
            $offset = ($page - 1) * $limit;
            $source = $_GET['source'] ?? 'all';

            $sql = "SELECT c.*, s.first_name, s.last_name, s.avatar, s.lead_score, v.email, v.ip_address, v.subscriber_id,
                    (SELECT display_name FROM zalo_subscribers WHERE zalo_user_id = REPLACE(c.visitor_id, 'zalo_', '') LIMIT 1) as zalo_name,
                    (SELECT COUNT(*) FROM web_blacklist WHERE ip_address = v.ip_address) as is_blocked
                    FROM ai_conversations c 
                    LEFT JOIN web_visitors v ON c.visitor_id = v.id
                    LEFT JOIN subscribers s ON v.subscriber_id = s.id
                    WHERE c.property_id = ?";

            if ($source === 'web')
                $sql .= " AND c.visitor_id NOT LIKE 'zalo_%'";
            elseif ($source === 'zalo')
                $sql .= " AND c.visitor_id LIKE 'zalo_%'";

            $sql .= " ORDER BY c.last_message_at DESC LIMIT $limit OFFSET $offset";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$propertyId]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            exit;
        }

        if ($action === 'get_messages' && !empty($_GET['conversation_id'])) {
            $stmt = $pdo->prepare("SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC");
            $stmt->execute([$_GET['conversation_id']]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            exit;
        }
    }

    // ---------------------------------------------------------
    // POST REQUESTS (Chat Logic)
    // ---------------------------------------------------------
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $_GET['action'] ?? $input['action'] ?? null;

        // Admin Actions
        if ($action === 'send_human_reply') {
            $pdo->prepare("INSERT INTO ai_messages (conversation_id, sender, message) VALUES (?, 'human', ?)")->execute([$input['conversation_id'], $input['message']]);
            $pdo->prepare("UPDATE ai_conversations SET status = 'human', updated_at = NOW() WHERE id = ?")->execute([$input['conversation_id']]);
            updateConversationStats($pdo, $input['conversation_id'], $input['message']);
            echo json_encode(['success' => true]);
            exit;
        }

        if ($action === 'update_status') {
            $pdo->prepare("UPDATE ai_conversations SET status = ?, updated_at = NOW() WHERE id = ?")->execute([$input['status'], $input['conversation_id']]);
            echo json_encode(['success' => true]);
            exit;
        }

        // === MAIN BOT LOGIC ===
        $userMsg = strip_tags(trim($input['message'] ?? ''));
        $context = $input['context'] ?? [];
        $propertyId = $input['property_id'] ?? $context['property_id'] ?? null;
        $visitorUuid = $input['visitor_id'] ?? $context['visitor_id'] ?? null; // Can be null in TEST mode
        $clientIp = $_SERVER['REMOTE_ADDR'];
        $isTest = !empty($input['is_test']);

        if (empty($userMsg) || empty($propertyId)) {
            echo json_encode(['success' => false, 'message' => 'Missing data']);
            exit;
        }

        // 1. Security (Skip for Test)
        if (!$isTest) {
            if (isIpBlocked($pdo, $clientIp))
                die(json_encode(['success' => false, 'message' => 'Access blocked.']));
            $spam = checkSpam($pdo, $visitorUuid, $clientIp, $userMsg);
            if ($spam['spam'])
                die(json_encode(['success' => true, 'data' => ['message' => $spam['message']]]));
        }

        // 2. Load Settings & API Key
        $settings = getSettingsCached($pdo, $propertyId, $GLOBAL_GEMINI_KEY);
        $apiKey = $settings['gemini_api_key'] ?: $GLOBAL_GEMINI_KEY;

        // 3. Identification & Conversation State
        $convId = null;
        $isIdentified = false;

        if (!$isTest) {
            $stmtBase = $pdo->prepare("SELECT v.email, v.phone, v.subscriber_id, c.id as conv_id, c.status as conv_status FROM web_visitors v LEFT JOIN ai_conversations c ON v.id = c.visitor_id AND c.property_id = ? AND c.status != 'closed' WHERE v.id = ? ORDER BY c.created_at DESC LIMIT 1");
            $stmtBase->execute([$propertyId, $visitorUuid]);
            $baseData = $stmtBase->fetch(PDO::FETCH_ASSOC);

            if (!$baseData)
                die(json_encode(['success' => false, 'message' => 'Session expired.']));

            $isIdentified = (!empty($baseData['email']) || !empty($baseData['phone']) || !empty($baseData['subscriber_id']));
            $convId = $baseData['conv_id'];

            // Human Takeover?
            if (($baseData['conv_status'] ?? '') === 'human') {
                $pdo->prepare("INSERT INTO ai_messages (conversation_id, sender, message) VALUES (?, 'visitor', ?)")->execute([$convId, $userMsg]);
                updateConversationStats($pdo, $convId, $userMsg);
                echo json_encode(['success' => true, 'human_takeover' => true]);
                exit;
            }

            // Duplicate Check
            $stmtDup = $pdo->prepare("SELECT 1 FROM ai_messages m JOIN ai_conversations c ON m.conversation_id = c.id WHERE c.visitor_id = ? AND m.sender = 'visitor' AND m.message = ? AND m.created_at > NOW() - INTERVAL 2 MINUTE LIMIT 1");
            $stmtDup->execute([$visitorUuid, $userMsg]);
            if ($stmtDup->fetch())
                die(json_encode(['success' => true, 'data' => ['message' => 'Dạ em đang xử lý, anh/chị chờ xíu nhé!']]));
        }

        // 4. Fast Reply (Rule-based)
        $fastReply = getFastReply($userMsg, $settings);
        if ($fastReply) {
            if (!$isTest) {
                if (!$convId) {
                    enforceChatLimits($pdo, $visitorUuid);
                    $convId = bin2hex(random_bytes(16));
                    $pdo->prepare("INSERT INTO ai_conversations (id, visitor_id, property_id, status) VALUES (?, ?, ?, 'ai')")->execute([$convId, $visitorUuid, $propertyId]);
                }
                $pdo->prepare("INSERT INTO ai_messages (conversation_id, sender, message) VALUES (?, 'visitor', ?)")->execute([$convId, $userMsg]);
                $pdo->prepare("INSERT INTO ai_messages (conversation_id, sender, message) VALUES (?, 'ai', ?)")->execute([$convId, $fastReply]);
                updateConversationStats($pdo, $convId, $fastReply);
            }
            echo json_encode(['success' => true, 'data' => ['message' => $fastReply, 'fast_reply' => true]]);
            exit;
        }

        // 5. DATA PREPARATION (Shared Logic for Test & Prod)

        // A. Init Conversation (Prod Only)
        if (!$isTest && !$convId) {
            enforceChatLimits($pdo, $visitorUuid);
            $convId = bin2hex(random_bytes(16));
            $pdo->prepare("INSERT INTO ai_conversations (id, visitor_id, property_id, status) VALUES (?, ?, ?, 'ai')")->execute([$convId, $visitorUuid, $propertyId]);
            handleFirstChatPoints($pdo, $visitorUuid, $propertyId);
        }

        // B. Save User Message (Prod Only)
        if (!$isTest) {
            $pdo->prepare("INSERT INTO ai_messages (conversation_id, sender, message) VALUES (?, 'visitor', ?)")->execute([$convId, $userMsg]);
            updateConversationStats($pdo, $convId, $userMsg);

            // Lead Sync Regex
            if (preg_match('/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/ix', $userMsg, $m))
                syncLead($pdo, $visitorUuid, $propertyId, $m[0]);
            elseif (preg_match('/(0|\+84)(3|5|7|8|9)[0-9]{8,10}/', $userMsg, $m))
                syncLead($pdo, $visitorUuid, $propertyId, null, $m[0]);
        }

        if (str_word_count($userMsg) >= 1) {
            $maxChunks = (int) ($settings['top_k'] ?? 10);
            $threshold = (float) ($settings['similarity_threshold'] ?? 0.45);
            // We ask RAG for more chunks than needed to filter by threshold later
            $ragData = retrieveContext($pdo, $propertyId, $userMsg, $context, $apiKey, $maxChunks * 2);
            $perf = $ragData['perf'] ?? [];
            $relevantContext = '';
            $count = 0;

            foreach (($ragData['results'] ?? []) as $c) {
                $relevantContext .= $c['content'] . "\n---\n";
                if (++$count >= $maxChunks)
                    break;
            }
        }

        // D. Build Prompt
        $currentPage = $context['current_url'] ?? 'trang web';
        // Test mode: visitorUuid might be null/fake, handled by helper if needed or ternary
        $activityContext = ($visitorUuid && !$isTest) ? getVisitorContext($pdo, $visitorUuid, $currentPage) : "Người dùng đang kiểm thử (Test Mode).";
        $systemInst = buildSystemPrompt($settings, $activityContext, $relevantContext, $isIdentified, $currentPage);

        // E. Build History (Optimized Merge)
        $contents = [];
        if ($isTest && !empty($input['history'])) {
            // Test Mode: History from client
            foreach ($input['history'] as $h) {
                $role = ($h['role'] === 'visitor' || $h['role'] === 'user') ? 'user' : 'model';
                $msg = $h['parts'][0]['text'] ?? $h['message'] ?? '';

                // Skip automated welcome/greeting messages from the BOT only
                // This ensures we don't accidentally skip a user's "Hi" which might be important context
                if ($role === 'model' && mb_strlen($msg) < 100 && preg_match('/^(xin chào|chào mừng|hello|hi|dạ chào|dạ em có thể|bạn có thể hỏi)/iu', trim($msg))) {
                    continue;
                }

                $contents[] = ["role" => $role, "parts" => [["text" => $msg]]];
            }
            // Ensure last message is user
            if (empty($contents) || end($contents)['role'] !== 'user') {
                $contents[] = ["role" => "user", "parts" => [["text" => $userMsg]]];
            }
        } elseif (!$isTest) {
            // Prod Mode: History from DB
            $limit = (int) ($settings['history_limit'] ?? 10);
            $stmtH = $pdo->prepare("SELECT sender, message FROM ai_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?");
            $stmtH->bindValue(1, $convId, PDO::PARAM_STR);
            $stmtH->bindValue(2, $limit, PDO::PARAM_INT);
            $stmtH->execute();
            $history = array_reverse($stmtH->fetchAll(PDO::FETCH_ASSOC));

            foreach ($history as $h) {
                $msg = $h['message'];
                $role = ($h['sender'] === 'visitor') ? 'user' : 'model';

                // Skip automated welcome/greeting messages from the BOT only
                if ($role === 'model' && mb_strlen($msg) < 100 && preg_match('/^(xin chào|chào mừng|hello|hi|dạ chào|dạ em có thể|bạn có thể hỏi)/iu', trim($msg))) {
                    continue;
                }

                // Optimized Merge Logic
                $lastIdx = array_key_last($contents);
                if ($lastIdx !== null && $contents[$lastIdx]['role'] === $role) {
                    $contents[$lastIdx]['parts'][0]['text'] .= "\n\n" . $msg;
                } else {
                    $contents[] = ["role" => $role, "parts" => [["text" => $msg]]];
                }
            }

            // Append current msg if not in history (Wait, we inserted it already?)
            // If we inserted it, it SHOULD be in history. If for some reason it's not (race condition), append it.
            if (empty($contents) || $contents[array_key_last($contents)]['role'] !== 'user') {
                $lastMsg = !empty($contents) ? $contents[array_key_last($contents)]['parts'][0]['text'] : '';
                if (strpos($lastMsg, $userMsg) === false) { // Simple check
                    $contents[] = ["role" => "user", "parts" => [["text" => $userMsg]]];
                }
            }
        }

        // CRITICAL FIX: Gemini API requires non-empty 'contents'
        if (empty($contents)) {
            $contents[] = ["role" => "user", "parts" => [["text" => $userMsg]]];
        }

        // 6. GENERATE & RESPONSE
        try {
            // 10M UPGRADE: Skip Gemini cost if it's a "substantial" question with NO knowledge hits
            $isSubstantialMsg = (mb_strlen($userMsg) > 20 || count(explode(' ', $userMsg)) > 4);

            if (empty($relevantContext) && $isSubstantialMsg) {
                $botRes = "Dạ, hiện tại em chưa có thông tin chi tiết về phần này để tư vấn chính xác cho mình. Anh/Chị vui lòng để lại thông tin liên hệ (Email hoặc SĐT), tư vấn viên chuyên nghiệp bên em sẽ kiểm tra kỹ và gọi lại hỗ trợ mình ngay ạ! [SHOW_LEAD_FORM]";
            } else {
                $botRes = generateResponse($contents, $systemInst, $apiKey);
            }
        } catch (Exception $e) {
            error_log("AI Error: " . $e->getMessage());
            $botRes = "Dạ, hệ thống đang bận một chút. Anh/Chị thử lại sau giây lát nhé!";
        }

        // Extract Actions
        $quickActions = [];
        if (preg_match('/\[ACTIONS:(.*?)\]/', $botRes, $matches)) {
            $quickActions = array_map('trim', explode('|', $matches[1]));
            $botRes = trim(str_replace($matches[0], '', $botRes));
        }

        // Save Bot Reply (Prod Only)
        if (!$isTest) {
            $pdo->prepare("INSERT INTO ai_messages (conversation_id, sender, message) VALUES (?, 'ai', ?)")->execute([$convId, $botRes]);
            updateConversationStats($pdo, $convId, $botRes);
        }

        echo json_encode([
            'success' => true,
            'version' => API_VERSION,
            'data' => [
                'message' => $botRes,
                'quick_actions' => $quickActions,
                'is_test' => $isTest,
                'perf' => $perf
            ]
        ]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
