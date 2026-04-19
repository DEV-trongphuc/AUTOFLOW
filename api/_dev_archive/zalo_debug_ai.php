<?php
// api/zalo_debug_ai.php
require_once 'db_connect.php';
require_once 'zalo_helpers.php';
require_once 'zalo_inbound_processor.php';

echo "<pre style='background:#1e1e1e;color:#00ff00;padding:20px;font-family:monospace;'>";
echo "=== ZALO AI DEBUGGER ===\n\n";

// 1. Lấy tin nhắn Zalo cuối cùng
function isScenarioActive($scenario, $nowTime, $nowDay)
{
    if (($scenario['schedule_type'] ?? 'full') === 'full')
        return true;
    
    // Support per-day schedule in active_days (JSON)
    if (isset($scenario['active_days']) && strpos($scenario['active_days'], '{') === 0) {
        $custom = json_decode($scenario['active_days'], true);
        if (isset($custom[$nowDay])) {
            $s = $custom[$nowDay]['start'] ?? '00:00';
            $e = $custom[$nowDay]['end'] ?? '23:59';
            if ($s > $e) return ($nowTime >= $s || $nowTime <= $e);
            else return ($nowTime >= $s && $nowTime <= $e);
        }
        return false;
    }
    
    $days = explode(',', $scenario['active_days'] ?? '');
    if (!in_array((string) $nowDay, $days)) return false;
    
    $s = $scenario['start_time'];
    $e = $scenario['end_time'];
    if ($s > $e) return ($nowTime >= $s || $nowTime <= $e);
    else return ($nowTime >= $s && $nowTime <= $e);
}

echo "[1] Fetching last inbound Zalo message...\n";
$stmt = $pdo->query("SELECT * FROM zalo_user_messages WHERE direction = 'inbound' ORDER BY created_at DESC LIMIT 1");
$msg = $stmt->fetch();

if (!$msg) {
    die("❌ Không tìm thấy tin nhắn Zalo inbound nào trong DB.");
}

$zaloUserId = $msg['zalo_user_id'];
$msgText = $msg['message_text'];
echo "✅ Zalo User ID: $zaloUserId\n";
echo "✅ Message Text: $msgText\n\n";

// 2. Kiểm tra Subscriber / PAUSE State
echo "[2] Checking AI Pause State...\n";
$stmtSub = $pdo->prepare("SELECT id, ai_paused_until FROM zalo_subscribers WHERE zalo_user_id = ? LIMIT 1");
$stmtSub->execute([$zaloUserId]);
$subData = $stmtSub->fetch();
$subId = $subData['id'] ?? null;
echo "✅ Subscriber ID: " . ($subId ?: 'NOT FOUND') . "\n";
echo "✅ AI Paused Until: " . ($subData['ai_paused_until'] ?? 'NULL') . "\n";

$isPaused = isAiPaused($pdo, $subId, $zaloUserId);
echo $isPaused ? "❌ Kết quả: AI ĐANG BỊ TẠM DỪNG (isAiPaused = true)\n\n" : "✅ Kết quả: AI KHÔNG bị tạm dừng\n\n";

// 3. Lấy OA Config
echo "[3] Fetching OA Config...\n";
$stmtOA = $pdo->prepare("SELECT * FROM zalo_oa_configs LIMIT 1");
$stmtOA->execute();
$oaConfig = $stmtOA->fetch();
$oaId = $oaConfig['id'];
echo "✅ OA Config ID: $oaId\n\n";

// 4. Tìm kịch bản AI (Fallback AI)
echo "[4] Seeking matching AI Scenario...\n";
$nowTime = date('H:i:s');
$nowDay = date('w');

$stmtAI = $pdo->prepare("SELECT * FROM zalo_automation_scenarios WHERE oa_config_id = ? AND type = 'ai_reply' AND (trigger_text IS NULL OR trigger_text = '' OR trigger_text = '*') AND status = 'active' LIMIT 1");
$stmtAI->execute([$oaId]);
$rowAI = $stmtAI->fetch();

if ($rowAI) {
    echo "✅ Found Fallback AI Scenario ID: " . $rowAI['id'] . "\n";
    echo "   - AI Chatbot ID (Property ID): " . $rowAI['ai_chatbot_id'] . "\n";
    $isActive = isScenarioActive($rowAI, $nowTime, $nowDay);
    echo $isActive ? "✅ Kịch bản đang Active trong khung giờ.\n\n" : "❌ Kịch bản KHÔNG Active trong khung giờ.\n\n";
    
    if ($isActive) {
        if ($isPaused) {
            echo "❌ Bỏ qua gọi AI vì AI đang bị Pause.\n";
        } else {
            echo "[5] TESTING API CALL TO ai_chatbot.php...\n";
            $url = API_BASE_URL . "/ai_chatbot.php";
            echo "   - Endpoint: $url\n";
            
            $postData = [
                'message' => $msgText,
                'property_id' => $rowAI['ai_chatbot_id'],
                'visitor_id' => "zalo_" . $zaloUserId,
                'is_test' => true // Test mode để ko tốn quota
            ];
            
            echo "   - Payload: " . json_encode($postData) . "\n";
            
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2); // [FIX P12-C1]
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            
            $resRaw = curl_exec($ch);
            $curlErr = curl_error($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($resRaw === false) {
                echo "❌ cURL Error ($httpCode): $curlErr\n\n";
                if ($httpCode == 0 || strpos($curlErr, 'Could not resolve') !== false || strpos($curlErr, 'Failed to connect') !== false) {
                    echo "⚠️ NGUYÊN NHÂN KHẢ NĂNG CAO: API_BASE_URL (" . API_BASE_URL . ") đang cấu hình không đúng hoặc server không gọi CURL lại chính nó được (loopback SSL/port).\n";
                    echo "Hãy kiểm tra API_BASE_URL trong db_connect.php\n";
                }
            } else {
                echo "✅ API HTTP Code: $httpCode\n";
                echo "✅ API Response Output:\n";
                
                $parsedJson = json_decode($resRaw, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    echo json_encode($parsedJson, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
                    
                    if (isset($parsedJson['message']) && strpos($parsedJson['message'], 'Chatbot is currently disabled') !== false) {
                        echo "❌ LỖI: Chatbot đang tắt (Disabled by administrator). Bật AI lên.\n";
                    } elseif (isset($parsedJson['success']) && $parsedJson['success'] === false) {
                        echo "❌ LỖI TỪ AI_CHATBOT.PHP: " . ($parsedJson['message'] ?? 'Unknown err') . "\n";
                    } else {
                        echo "✅ AI_CHATBOT.PHP THÀNH CÔNG. Bắt đầu gửi qua Zalo...\n";
                        echo "[6] GỌI HÀM sendZaloAIReply THỰC TẾ...\n";
                        
                        // Fake a non-test scenario to trigger it exactly like prod
                        $rowAI_prod = $rowAI;
                        
                        // Capture standard error stream because we want to see logs
                        $logFile = __DIR__ . '/zalo_debug.log';
                        $beforeLogSize = file_exists($logFile) ? filesize($logFile) : 0;
                        
                        // This will now parse the fast-reply/AI reply and DO Zalo send
                        sendZaloAIReply($pdo, $zaloUserId, $oaConfig['access_token'], $rowAI_prod, $msgText);
                        
                        clearstatcache();
                        $afterLogSize = file_exists($logFile) ? filesize($logFile) : 0;
                        
                        echo "✅ Hoàn tất gọi sendZaloAIReply.\n";
                        if ($afterLogSize > $beforeLogSize) {
                            echo "❌ CÓ LỖI TỪ ZALO OA API ĐƯỢC GHI RA LOG!\n";
                            $logContents = file_get_contents($logFile);
                            echo "Nội dung Log cuối:\n" . substr($logContents, -500);
                        } else {
                            echo "✅ KQ Truyền Zalo: Không có lỗi ghi nào từ Zalo (Thành công!).\n";
                            echo "Tuy nhiên nếu tin nhắn vẫn KHÔNG TỚI, hãy xem lại:\n";
                            echo "- Cấp quyền cho app gửi ZNS/CS?\n";
                            echo "- Format JSON Buttons gửi cho Zalo có bị sai cú pháp không?\n";
                        }
                    }
                } else {
                    echo "❌ Response không phải JSON (Lỗi PHP Error hoặc 500):\n\n";
                    echo htmlspecialchars($resRaw) . "\n";
                }
            }
        }
    }
} else {
    echo "❌ LỖI: Không có kịch bản AI_REPLY nào đang Active (hoặc sai oa_config_id).\n";
}

echo "</pre>";
