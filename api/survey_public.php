<?php
// api/survey_public.php — Public Survey API (No Auth Required)
// Rate limited: 10 submissions per IP per hour
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once 'db_connect.php';
require_once 'flow_helpers.php';

$slug   = $_GET['slug'] ?? '';
$action = $_GET['action'] ?? 'schema';
$input  = json_decode(file_get_contents('php://input'), true) ?? [];

if (empty($slug)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Slug is required']);
    exit;
}

try {
    // Fetch survey by slug
    $stmt = $pdo->prepare("SELECT * FROM surveys WHERE slug = ?");
    $stmt->execute([$slug]);
    $survey = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$survey) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'SURVEY_NOT_FOUND']);
        exit;
    }

    // ─── GET SCHEMA ──────────────────────────────────────────────────────────
    if ($action === 'schema') {
        // Check if survey is accessible
        $status = $survey['status'];
        $isPreview = !empty($_GET['preview']);

        if (!$isPreview) {
            if ($status === 'draft') {
                echo json_encode(['success' => false, 'error' => 'SURVEY_NOT_PUBLISHED', 'status' => $status]);
                exit;
            }
            if (in_array($status, ['paused', 'closed'])) {
                echo json_encode(['success' => false, 'error' => 'SURVEY_CLOSED', 'status' => $status]);
                exit;
            }

            // Check close_at
            if (!empty($survey['close_at']) && strtotime($survey['close_at']) < time()) {
                $pdo->prepare("UPDATE surveys SET status = 'closed' WHERE id = ?")->execute([$survey['id']]);
                echo json_encode(['success' => false, 'error' => 'SURVEY_EXPIRED']);
                exit;
            }

            // Check response_limit
            if (!empty($survey['response_limit'])) {
                $countStmt = $pdo->prepare("SELECT COUNT(*) FROM survey_responses WHERE survey_id = ?");
                $countStmt->execute([$survey['id']]);
                if ((int)$countStmt->fetchColumn() >= (int)$survey['response_limit']) {
                    echo json_encode(['success' => false, 'error' => 'SURVEY_LIMIT_REACHED']);
                    exit;
                }
            }
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'id'           => $survey['id'],
                'name'         => $survey['name'],
                'slug'         => $survey['slug'],
                'status'       => $survey['status'],
                'blocks'       => json_decode($survey['blocks_json'] ?? '[]'),
                'settings'     => json_decode($survey['settings_json'] ?? '{}'),
                'thank_you_page' => json_decode($survey['thank_you_page'] ?? '{}'),
                'cover_style'  => json_decode($survey['cover_style'] ?? '{}'),
                'allow_anonymous' => (bool)$survey['allow_anonymous'],
                'require_login'   => (bool)$survey['require_login'],
            ]
        ]);
        exit;
    }

    // ─── SUBMIT ──────────────────────────────────────────────────────────────
    if ($action === 'submit' && $_SERVER['REQUEST_METHOD'] === 'POST') {

        // Enforce countdown expiration lock
        $themeObj = json_decode($survey['cover_style'] ?? '{}', true);
        if (!empty($themeObj['coverCountdown']) && strtotime($themeObj['coverCountdown']) <= time()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'SURVEY_EXPIRED']);
            exit;
        }

        // Rate limiting by IP hash
        $ipHash = hash('sha256', $_SERVER['REMOTE_ADDR'] ?? '');
        $rateLimitStmt = $pdo->prepare("
            SELECT COUNT(*) FROM survey_responses
            WHERE survey_id = ? AND ip_hash = ? AND submitted_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        ");
        $rateLimitStmt->execute([$survey['id'], $ipHash]);
        if ((int)$rateLimitStmt->fetchColumn() >= 10) {
            http_response_code(429);
            echo json_encode(['success' => false, 'error' => 'RATE_LIMIT_EXCEEDED']);
            exit;
        }

        // Session token dedup
        $sessionToken = $_SERVER['HTTP_X_SESSION_TOKEN'] ?? ($input['session_token'] ?? '');
        if (empty($sessionToken)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'SESSION_TOKEN_REQUIRED']);
            exit;
        }
        $dedupStmt = $pdo->prepare("SELECT id FROM survey_responses WHERE session_token = ?");
        $dedupStmt->execute([$sessionToken]);
        if ($dedupStmt->fetch()) {
            echo json_encode(['success' => false, 'error' => 'ALREADY_SUBMITTED']);
            exit;
        }

        // [SEC] Sanitize payload to prevent XSS
        $sanitizePayload = function($data) use (&$sanitizePayload) {
            if (is_array($data)) {
                $sanitized = [];
                foreach ($data as $k => $v) {
                    $sanitized[$k] = $sanitizePayload($v);
                }
                return $sanitized;
            }
            if (is_scalar($data)) {
                return htmlspecialchars((string)$data, ENT_QUOTES, 'UTF-8');
            }
            return $data;
        };

        $answers = $sanitizePayload($input['answers'] ?? []);
        $submittedEmail = null;
        if ($survey['one_per_email']) {
            foreach ($answers as $ans) {
                if (($ans['type'] ?? '') === 'email' && !empty($ans['answer_text'])) {
                    $submittedEmail = strtolower(trim($ans['answer_text']));
                }
            }
            if ($submittedEmail) {
                $emailCheckStmt = $pdo->prepare("
                    SELECT r.id FROM survey_responses r
                    JOIN subscribers s ON s.id = r.subscriber_id
                    WHERE r.survey_id = ? AND s.email = ?
                    LIMIT 1
                ");
                $emailCheckStmt->execute([$survey['id'], $submittedEmail]);
                if ($emailCheckStmt->fetch()) {
                    echo json_encode(['success' => false, 'error' => 'EMAIL_ALREADY_RESPONDED']);
                    exit;
                }
            }
        }

        // Detect device
        $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
        $device = 'desktop';
        if (preg_match('/Mobile|Android|iPhone|iPad/i', $ua)) {
            $device = preg_match('/iPad|Tablet/i', $ua) ? 'tablet' : 'mobile';
        }

        // Source channel
        $sourceChannel = $_SERVER['HTTP_X_SURVEY_SOURCE'] ?? ($input['source_channel'] ?? 'direct_link');
        $allowedSources = ['direct_link', 'qr_code', 'email_embed', 'widget', 'api'];
        if (!in_array($sourceChannel, $allowedSources)) $sourceChannel = 'direct_link';

        // Geo Location (from Cloudflare if available)
        $geoCountry = $_SERVER['HTTP_CF_IPCOUNTRY'] ?? null;
        $geoCity = $_SERVER['HTTP_CF_IPCITY'] ?? null;

        $subscriberId = null;
        $submittedName = null;
        $submittedPhone = null;
        foreach ($answers as $ans) {
            if (($ans['type'] ?? '') === 'email' && !empty($ans['answer_text'])) {
                $submittedEmail = strtolower(trim($ans['answer_text']));
            }
            if (($ans['type'] ?? '') === 'phone_number' && !empty($ans['answer_text'])) {
                // Ensure Phone extraction works too
                $submittedPhone = trim($ans['answer_text']);
            }
            if (in_array($ans['type'] ?? '', ['short_text']) && stripos($ans['label'] ?? '', 'tên') !== false) {
                $submittedName = trim($ans['answer_text'] ?? '');
            }
        }

        $settingsObj = json_decode($survey['settings_json'] ?? '{}', true);
        if (empty($submittedEmail) && !empty($settingsObj['email_tracking']) && !empty($input['uid'])) {
            // UID is expected to be passed via URL ?uid=xxx@email.com injected by email system merge tags
            $parsedUid = filter_var(trim($input['uid']), FILTER_VALIDATE_EMAIL);
            if ($parsedUid) {
                $submittedEmail = $parsedUid;
            }
        }
        if ($submittedEmail) {
            $subStmt = $pdo->prepare("SELECT id, phone_number FROM subscribers WHERE email = ? AND workspace_id = ? LIMIT 1");
            $subStmt->execute([$submittedEmail, $survey['workspace_id']]);
            $existSub = $subStmt->fetch();
            if ($existSub) {
                $subscriberId = $existSub['id'];
                if ($submittedPhone && empty($existSub['phone_number'])) {
                    $pdo->prepare("UPDATE subscribers SET phone_number = ? WHERE id = ?")
                        ->execute([$submittedPhone, $subscriberId]);
                }
            } else {
                $subscriberId = generateUUID();
                $pdo->prepare("INSERT INTO subscribers (id, email, phone_number, first_name, source, workspace_id, created_at)
                    VALUES (?, ?, ?, ?, 'survey', ?, NOW())")
                    ->execute([$subscriberId, $submittedEmail, $submittedPhone, $submittedName ?? '', $survey['workspace_id']]);
            }
            // Tag subscriber
            $tagName = 'survey_responded_' . $survey['id'];
            // (Simplified — full tag system integration can be added)
            
            // Add to Target List if configured
            if (!empty($survey['target_list_id'])) {
                // [FIX BUG-SQL-2] Wrong table name 'list_subscribers' doesn't exist.
                // Correct table is 'subscriber_lists(subscriber_id, list_id)'
                $stmtListIns = $pdo->prepare("INSERT IGNORE INTO subscriber_lists (subscriber_id, list_id) VALUES (?, ?)");
                $stmtListIns->execute([$subscriberId, $survey['target_list_id']]);
                // [FIX BUG-SQL-2b] Only increment subscriber_count if the row was newly inserted.
                // Original NOT EXISTS check ran AFTER the INSERT, so NOT EXISTS was always FALSE
                // (the row already existed), and subscriber_count was never incremented.
                if ($stmtListIns->rowCount() > 0) {
                    $pdo->prepare("UPDATE lists SET subscriber_count = subscriber_count + 1 WHERE id = ?")
                        ->execute([$survey['target_list_id']]);
                }
            }
        }

        // Auto-migrate schema for quiz scores
        try {
            $checkCol = $pdo->query("SHOW COLUMNS FROM survey_responses LIKE 'total_score'")->fetch();
            if (!$checkCol) {
                $pdo->exec("ALTER TABLE survey_responses ADD COLUMN total_score FLOAT DEFAULT NULL, ADD COLUMN max_score FLOAT DEFAULT NULL");
            }
            $checkColScreen = $pdo->query("SHOW COLUMNS FROM survey_responses LIKE 'end_screen_id'")->fetch();
            if (!$checkColScreen) {
                $pdo->exec("ALTER TABLE survey_responses ADD COLUMN end_screen_id VARCHAR(100) DEFAULT 'default'");
            }
        } catch (Exception $e) {}

        // INSERT response
        $responseId = generateUUID();
        
        // --- QUIZ ANTI-CHEAT SERVER-SIDE VALIDATION ---
        $totalScore = null;
        $maxScore = null;
        $blocks = json_decode($survey['blocks_json'] ?? '[]', true);
        if (!empty($settingsObj['quiz']['enabled'])) {
            $totalScore = 0;
            $maxScore = 0;
            $ansMap = [];
            foreach ($answers as $ans) {
                if (!empty($ans['block_id'])) {
                    $ansMap[$ans['block_id']] = $ans;
                }
            }
            foreach ($blocks as $block) {
                if (!empty($block['quizPoints'])) {
                    $maxScore += (float)$block['quizPoints'];
                    if (isset($ansMap[$block['id']])) {
                        $ans = $ansMap[$block['id']];
                        $matchType = $block['correctAnswerMatch'] ?? 'exact';
                        $correct = $block['correctAnswer'] ?? null;
                        
                        $isCorrect = false;
                        if ($correct !== null) {
                            $type = $ans['type'] ?? '';
                            if (in_array($type, ['single_choice', 'dropdown', 'yes_no', 'short_text', 'number'])) {
                                $val = strtolower((string)($ans['answer_text'] ?? $ans['answer_num'] ?? ''));
                                $target = strtolower((string)$correct);
                                if ($matchType === 'contains' && strpos($val, $target) !== false) $isCorrect = true;
                                else if ($val === $target) $isCorrect = true;
                            } else if ($type === 'multi_choice' && is_array($ans['answer_json'] ?? null) && is_array($correct)) {
                                $arrAns = $ans['answer_json'];
                                $arrCorr = $correct;
                                sort($arrAns);
                                sort($arrCorr);
                                if (json_encode($arrAns) === json_encode($arrCorr)) $isCorrect = true;
                            }
                        }
                        if ($isCorrect) {
                            $totalScore += (float)$block['quizPoints'];
                        }
                    }
                }
            }
        }
        
        $endScreenId = $input['end_screen_id'] ?? 'default';

        $pdo->prepare("
            INSERT INTO survey_responses
              (id, survey_id, subscriber_id, session_token, answers_json, completion_rate,
               time_spent_sec, source_channel, utm_source, utm_medium, utm_campaign,
               ip_hash, user_agent, device_type, referrer_url, geo_country, geo_city,
               total_score, max_score, end_screen_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ")->execute([
            $responseId, $survey['id'], $subscriberId, $sessionToken,
            json_encode($answers),
            (int)($input['completion_rate'] ?? 100),
            $input['time_spent_sec'] ?? null,
            $sourceChannel,
            $input['utm_source'] ?? null,
            $input['utm_medium'] ?? null,
            $input['utm_campaign'] ?? null,
            $ipHash, substr($ua, 0, 512), $device,
            substr($_SERVER['HTTP_REFERER'] ?? '', 0, 1024),
            $geoCountry, $geoCity,
            $totalScore, $maxScore, $endScreenId
        ]);

        // INSERT answer details
        $detailStmt = $pdo->prepare("
            INSERT INTO survey_answer_details (id, response_id, survey_id, question_id, answer_text, answer_num, answer_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        foreach ($answers as $ans) {
            if (empty($ans['question_id'])) continue;
            $answerNum  = null;
            $answerJson = null;
            $answerText = $ans['answer_text'] ?? null;
            if (isset($ans['answer_num'])) $answerNum = (float)$ans['answer_num'];
            if (isset($ans['answer_json'])) $answerJson = json_encode($ans['answer_json']);
            $detailStmt->execute([generateUUID(), $responseId, $survey['id'], $ans['question_id'], $answerText, $answerNum, $answerJson]);
        }

        // VOUCHER REWARD EVALUATION
        $claimedVoucherCode = null;
        if (!empty($settingsObj['voucher_config']['enabled']) && !empty($settingsObj['voucher_config']['campaign_id']) && $subscriberId) {
            $vConfig = $settingsObj['voucher_config'];
            $targetRewardItemId = $vConfig['fallback_reward_item_id'] ?? null;
            
            // Evaluate logic conditions if provided
            if (!empty($vConfig['logic_mappings']) && is_array($vConfig['logic_mappings'])) {
                foreach ($vConfig['logic_mappings'] as $mapping) {
                    $cond = $mapping['condition'] ?? null;
                    if (!$cond || empty($cond['question_id'])) continue;
                    
                    $qId = $cond['question_id'];
                    $op = $cond['operator'] ?? 'equals';
                    $val = $cond['value'] ?? '';
                    
                    // Find answer for this question
                    $ansMatched = null;
                    foreach ($answers as $a) {
                        if (($a['question_id'] ?? '') === $qId) {
                            $ansMatched = $a;
                            break;
                        }
                    }
                    
                    if (!$ansMatched) {
                        if ($op === 'is_empty') {
                            $targetRewardItemId = $mapping['reward_item_id'] ?? $targetRewardItemId;
                            break;
                        }
                        continue; // No answer provided
                    }
                    
                    $isMatched = false;
                    $actualText = strtolower(trim((string)($ansMatched['answer_text'] ?? $ansMatched['answer_num'] ?? '')));
                    $expectedText = strtolower(trim((string)$val));
                    
                    if ($op === 'is_answered') {
                        $isMatched = true;
                    } else if ($op === 'is_empty') {
                        $isMatched = empty($actualText);
                    } else if ($op === 'equals' && $actualText === $expectedText) {
                        $isMatched = true;
                    } else if ($op === 'not_equals' && $actualText !== $expectedText) {
                        $isMatched = true;
                    } else if ($op === 'contains' && strpos($actualText, $expectedText) !== false) {
                        $isMatched = true;
                    } else if ($op === 'greater_than' && (float)$actualText > (float)$expectedText) {
                        $isMatched = true;
                    } else if ($op === 'less_than' && (float)$actualText < (float)$expectedText) {
                        $isMatched = true;
                    }
                    
                    if ($isMatched) {
                        $targetRewardItemId = $mapping['reward_item_id'] ?? $targetRewardItemId;
                        break; // Stop at first match
                    }
                }
            }
            
            if ($vConfig['campaign_id']) {
                require_once 'voucher_helper.php';
                $claimRes = claimVoucherAtomic($pdo, $vConfig['campaign_id'], $subscriberId, $targetRewardItemId, 'survey', $survey['id'], 'survey_voucher_claimed');
                if ($claimRes['success'] && !empty($claimRes['code'])) {
                    $claimedVoucherCode = $claimRes['code'];
                    // Update survey response with claimed code
                    $pdo->prepare("UPDATE survey_responses SET claimed_voucher_code = ? WHERE id = ?")
                        ->execute([$claimedVoucherCode, $responseId]);
                }
            }
        }

        // Flow trigger — priority worker (same as forms.php pattern)
        if ($subscriberId) {
            try {
                // 1. survey_submit trigger — maps active flows with trigger_type='survey' targeting this survey
                $apiUrl = defined('API_BASE_URL') ? API_BASE_URL : 'https://automation.ideas.edu.vn/mail_api';
                if (strpos($apiUrl, 'http') === false) {
                    $apiUrl = 'https://automation.ideas.edu.vn/mail_api';
                }
                $workerUrl = $apiUrl . '/worker_priority.php?' . http_build_query([
                    'trigger_type' => 'survey',
                    'target_id'    => $survey['id'],
                    'subscriber_id'=> $subscriberId
                ]);
                $cronSecret = getenv('CRON_SECRET') ?: 'autoflow_cron_2026';
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $workerUrl);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
                curl_setopt($ch, CURLOPT_TIMEOUT, 2);
                curl_setopt($ch, CURLOPT_NOSIGNAL, 1);
                curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
                curl_setopt($ch, CURLOPT_HTTPHEADER, ['X-Cron-Secret: ' . $cronSecret]);
                @curl_exec($ch);
                curl_close($ch);

                // 2. Legacy: specific flow_trigger_id on survey row
                if (!empty($survey['flow_trigger_id'])) {
                    dispatchFlowWorker($pdo, 'flows', [
                        'trigger_type'  => 'flow_trigger',
                        'target_id'     => $survey['flow_trigger_id'],
                        'subscriber_id' => $subscriberId
                    ]);
                }
            } catch (Exception $e) {
                error_log('Survey flow trigger error: ' . $e->getMessage());
            }
        }

        // EVENT-DRIVEN WAKEUP FOR SURVEY CONDITIONS
        if (!empty($subscriberId)) {
            require_once 'trigger_helper.php';
            wakeupWaitingSubscribers($pdo, $subscriberId);
        }

        // INCREMENT SHORT LINK SUBMIT COUNT
        $slid = $input['slid'] ?? '';
        if (empty($slid) && isset($_SERVER['HTTP_REFERER'])) {
            parse_str(parse_url($_SERVER['HTTP_REFERER'], PHP_URL_QUERY) ?? '', $refQ);
            $slid = $refQ['slid'] ?? '';
        }
        if (!empty($slid)) {
            try {
                $pdo->prepare("UPDATE short_links SET submit_count = submit_count + 1 WHERE id = ?")->execute([$slid]);
            } catch (Exception $e) {}
        }

        $thankYou = json_decode($survey['thank_you_page'] ?? '{}', true);
        echo json_encode([
            'success'      => true,
            'response_id'  => $responseId,
            'thank_you'    => $thankYou,
            'voucher_code' => $claimedVoucherCode,
            'redirect_url' => $thankYou['redirectUrl'] ?? null,
        ]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);

} catch (Exception $e) {
    error_log('Survey Public API Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error']);
}

function generateUUID(): string {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff));
}
