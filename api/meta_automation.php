<?php
/**
 * Meta Automation API
 * Manage Scenarios (Welcome, Keywords, AI Reply)
 * Endpoint: /api/meta_automation.php
 */

require_once 'db_connect.php';
require_once 'meta_helpers.php';
require_once 'zalo_helpers.php';

metaApiHeaders();
checkZaloAutomationSchema($pdo);

$method = $_SERVER['REQUEST_METHOD'];
$route = $_GET['route'] ?? '';

try {
    if ($method === 'GET') {
        if ($route === 'list') {
            // -------------------------------------------------------------
            // LIST SCENARIOS
            // -------------------------------------------------------------
            $configId = $_GET['meta_config_id'] ?? null;

            $sql = "SELECT s.*, b.bot_name as ai_bot_name 
                    FROM meta_automation_scenarios s
                    LEFT JOIN ai_chatbot_settings b ON s.ai_chatbot_id = b.property_id";

            if ($configId) {
                $stmt = $pdo->prepare("$sql WHERE s.meta_config_id = ? ORDER BY s.created_at DESC");
                $stmt->execute([$configId]);
            } else {
                $stmt = $pdo->query("$sql ORDER BY s.created_at DESC");
            }

            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Decode JSON fields
            foreach ($data as &$row) {
                $row['buttons'] = json_decode($row['buttons'] ?? '[]', true);
            }

            jsonResponse(true, $data);

        } elseif ($route === 'check_conflicts') {
            // -------------------------------------------------------------
            // CHECK KEYWORD CONFLICTS
            // -------------------------------------------------------------
            $configId = $_GET['meta_config_id'] ?? '';
            $triggerText = $_GET['trigger_text'] ?? '';
            $excludeId = $_GET['id'] ?? '';

            if (!$configId) {
                jsonResponse(false, null, 'Config ID required');
            }

            $conflicts = [];
            $keywords = array_map('trim', explode(',', $triggerText));

            foreach ($keywords as $kw) {
                if (empty($kw))
                    continue;

                // Check if this keyword is part of any OTHER active scenario
                // (Using simple LIKE for containment or exact match)
                $sql = "SELECT title FROM meta_automation_scenarios 
                        WHERE meta_config_id = ? 
                        AND status = 'active' 
                        AND type = 'keyword' 
                        AND id != ?
                        AND (FIND_IN_SET(?, trigger_text) OR ? LIKE CONCAT('%', trigger_text, '%'))";

                $stmt = $pdo->prepare($sql);
                $stmt->execute([$configId, $excludeId, $kw, $kw]);
                $found = $stmt->fetchAll(PDO::FETCH_COLUMN);

                if ($found) {
                    foreach ($found as $title) {
                        $conflicts[] = "Từ khóa '$kw' trùng với: $title";
                    }
                }
            }

            jsonResponse(true, ['conflicts' => array_unique($conflicts)]);
        }

    } elseif ($method === 'POST') {
        // -------------------------------------------------------------
        // SAVE (CREATE / UPDATE)
        // -------------------------------------------------------------
        $input = getJsonInput();

        if ($route === 'save') {
            $id = !empty($input['id']) ? $input['id'] : bin2hex(random_bytes(16));
            $configId = $input['meta_config_id'] ?? '';

            if (!$configId) {
                jsonResponse(false, null, 'Meta Config ID is required');
            }

            $type = $input['type'] ?? 'keyword';
            $triggerText = $input['trigger_text'] ?? '';
            $matchType = $input['match_type'] ?? 'contains';
            $title = $input['title'] ?? 'New Scenario';
            $content = $input['content'] ?? '';
            $messageType = $input['message_type'] ?? 'text';
            $imageUrl = $input['image_url'] ?? '';
            $attachmentId = $input['attachment_id'] ?? '';
            $buttons = isset($input['buttons']) ? json_encode($input['buttons']) : '[]';
            $status = $input['status'] ?? 'active';
            $aiChatbotId = $input['ai_chatbot_id'] ?? null;

            // Scheduling
            $scheduleType = $input['schedule_type'] ?? 'full';
            $startTime = $input['start_time'] ?? '00:00:00';
            $endTime = $input['end_time'] ?? '23:59:59';
            $activeDays = $input['active_days'] ?? '0,1,2,3,4,5,6';
            $priorityOverride = $input['priority_override'] ?? 0;
            $holidayStartAt = !empty($input['holiday_start_at']) ? $input['holiday_start_at'] : null;
            $holidayEndAt = !empty($input['holiday_end_at']) ? $input['holiday_end_at'] : null;

            $sql = "INSERT INTO meta_automation_scenarios (
                    id, meta_config_id, type, trigger_text, match_type, title, content, 
                    message_type, image_url, attachment_id, buttons, status, ai_chatbot_id,
                    schedule_type, start_time, end_time, active_days, priority_override, 
                    holiday_start_at, holiday_end_at, updated_at
                ) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                    meta_config_id=VALUES(meta_config_id),
                    type=VALUES(type), trigger_text=VALUES(trigger_text), match_type=VALUES(match_type),
                    title=VALUES(title), content=VALUES(content), message_type=VALUES(message_type), 
                    image_url=VALUES(image_url), attachment_id=VALUES(attachment_id), buttons=VALUES(buttons), status=VALUES(status), 
                    ai_chatbot_id=VALUES(ai_chatbot_id), schedule_type=VALUES(schedule_type), 
                    start_time=VALUES(start_time), end_time=VALUES(end_time), active_days=VALUES(active_days),
                    priority_override=VALUES(priority_override), 
                    holiday_start_at=VALUES(holiday_start_at), holiday_end_at=VALUES(holiday_end_at), updated_at=NOW()";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $id,
                $configId,
                $type,
                $triggerText,
                $matchType,
                $title,
                $content,
                $messageType,
                $imageUrl,
                $attachmentId,
                $buttons,
                $status,
                $aiChatbotId,
                $scheduleType,
                $startTime,
                $endTime,
                $activeDays,
                $priorityOverride,
                $holidayStartAt,
                $holidayEndAt
            ]);

            jsonResponse(true, ['id' => $id], 'Scenario saved successfully');
        }

    } elseif ($method === 'DELETE') {
        // -------------------------------------------------------------
        // DELETE SCENARIO
        // -------------------------------------------------------------
        $id = $_GET['id'] ?? '';
        if (!$id) {
            jsonResponse(false, null, 'ID required');
        }

        $stmt = $pdo->prepare("DELETE FROM meta_automation_scenarios WHERE id = ?");
        $stmt->execute([$id]);

        jsonResponse(true, null, 'Deleted successfully');
    }

} catch (Exception $e) {
    jsonResponse(false, null, 'Server Error: ' . $e->getMessage());
}
?>