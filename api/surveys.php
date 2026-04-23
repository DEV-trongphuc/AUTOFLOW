<?php
// api/surveys.php — Survey Builder API (Auth Required)
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once 'db_connect.php';
require_once 'auth_middleware.php';

$workspace_id = get_current_workspace_id();
$action = $_GET['action'] ?? 'list';
$id     = $_GET['id'] ?? null;
$input  = json_decode(file_get_contents('php://input'), true) ?? [];

try {
    switch ($action) {

        // ─── LIST ────────────────────────────────────────────────────────────
        case 'list': {
            $stmt = $pdo->prepare("
                SELECT s.*,
                    (SELECT COUNT(*) FROM survey_responses r WHERE r.survey_id = s.id) AS response_count
                FROM surveys s
                WHERE s.workspace_id = ?
                ORDER BY s.updated_at DESC
            ");
            $stmt->execute([$workspace_id]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as &$row) {
                $row['settings_json'] = json_decode($row['settings_json'] ?? '{}', true);
            }
            echo json_encode(['success' => true, 'data' => $rows]);
            break;
        }

        // ─── GET SINGLE ──────────────────────────────────────────────────────
        case 'get': {
            $stmt = $pdo->prepare("SELECT * FROM surveys WHERE id = ? AND workspace_id = ?");
            $stmt->execute([$id, $workspace_id]);
            $survey = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$survey) { http_response_code(404); echo json_encode(['success' => false, 'error' => 'Not found']); exit; }
            $survey['blocks_json']   = json_decode($survey['blocks_json'] ?? '[]');
            $survey['settings_json'] = json_decode($survey['settings_json'] ?? '{}');
            $survey['thank_you_page']= json_decode($survey['thank_you_page'] ?? '{}');
            $survey['cover_style']   = json_decode($survey['cover_style'] ?? '{}');
            echo json_encode(['success' => true, 'data' => $survey]);
            break;
        }

        // ─── CREATE ──────────────────────────────────────────────────────────
        case 'create': {
            $newId   = generateUUID();
            $name    = trim($input['name'] ?? 'Khảo sát mới');
            $baseSlug= preg_replace('/[^a-z0-9]+/', '-', strtolower(iconv('UTF-8', 'ASCII//TRANSLIT', $name)));
            $slug    = $baseSlug . '-' . substr($newId, 0, 6);

            $blocks_json = '[]';
            if ($name === 'Khảo sát NPS') {
                $blocks_json = json_encode([
                    ['id' => uniqid(), 'type' => 'rating', 'question' => 'Bạn sẵn sàng giới thiệu sản phẩm của chúng tôi cho bạn bè/đồng nghiệp ở mức nào? (Từ 0-10)', 'required' => true, 'options' => ['scale' => 10, 'style' => 'nps']],
                    ['id' => uniqid(), 'type' => 'short_text', 'question' => 'Lý do chính cho điểm số của bạn là gì? (Tùy chọn)', 'required' => false]
                ], JSON_UNESCAPED_UNICODE);
            } elseif ($name === 'Phản hồi sản phẩm') {
                $blocks_json = json_encode([
                    ['id' => uniqid(), 'type' => 'multiple_choice', 'question' => 'Bạn đánh giá chất lượng sản phẩm như thế nào?', 'required' => true, 'options' => ['choices' => ['Rất tốt', 'Tốt', 'Bình thường', 'Kém']]],
                    ['id' => uniqid(), 'type' => 'long_text', 'question' => 'Bạn muốn chúng tôi cải thiện điều gì?', 'required' => false]
                ], JSON_UNESCAPED_UNICODE);
            } elseif ($name === 'Đánh giá dịch vụ') {
                $blocks_json = json_encode([
                    ['id' => uniqid(), 'type' => 'rating', 'question' => 'Vui lòng đánh giá chất lượng phục vụ của nhân viên:', 'required' => true, 'options' => ['scale' => 5, 'style' => 'star']],
                    ['id' => uniqid(), 'type' => 'short_text', 'question' => 'Góp ý thêm (Tùy chọn)', 'required' => false]
                ], JSON_UNESCAPED_UNICODE);
            } elseif ($name === 'Khảo sát thị trường') {
                $blocks_json = json_encode([
                    ['id' => uniqid(), 'type' => 'multiple_choice', 'question' => 'Sản phẩm nào bạn quan tâm nhất?', 'required' => true, 'options' => ['choices' => ['Phần mềm tự động hóa', 'Truyền thông Email', 'Tạo Khảo sát', 'Khác']]]
                ], JSON_UNESCAPED_UNICODE);
            } elseif ($name === 'Mẫu Quiz (Trắc nghiệm)') {
                $blocks_json = json_encode([
                    ['id' => uniqid(), 'type' => 'multiple_choice', 'question' => 'Câu 1: Câu hỏi trắc nghiệm của bạn là gì?', 'required' => true, 'options' => ['choices' => ['Đáp án A', 'Đáp án B', 'Đáp án C']]],
                    ['id' => uniqid(), 'type' => 'multiple_choice', 'question' => 'Câu 2: Chọn đáp án đúng', 'required' => true, 'options' => ['choices' => ['Sự thật', 'Giả định']]]
                ], JSON_UNESCAPED_UNICODE);
            } elseif ($name === 'Mẫu Check-in Event') {
                 $blocks_json = json_encode([
                    ['id' => uniqid(), 'type' => 'short_text', 'question' => 'Họ và Tên', 'required' => true],
                    ['id' => uniqid(), 'type' => 'short_text', 'question' => 'Số điện thoại', 'required' => true],
                    ['id' => uniqid(), 'type' => 'multiple_choice', 'question' => 'Bạn đã nhận quà sự kiện chưa?', 'required' => true, 'options' => ['choices' => ['Đã nhận', 'Chưa nhận']]]
                ], JSON_UNESCAPED_UNICODE);
            }

            $stmt = $pdo->prepare("
                INSERT INTO surveys (id, workspace_id, name, slug, status, blocks_json, settings_json, thank_you_page, cover_style)
                VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, '{}')
            ");
            $defaultSettings  = json_encode(['showProgressBar'=>true,'progressBarStyle'=>'bar','allowPartialSubmit'=>false,'trackIp'=>true,'trackLocation'=>false]);
            $defaultThankYou  = json_encode(['title'=>'Cảm ơn bạn! 🎉','message'=>'Phản hồi của bạn đã được ghi nhận.','showSocialShare'=>false]);
            $stmt->execute([$newId, $workspace_id, $name, $slug, $blocks_json, $defaultSettings, $defaultThankYou]);
            echo json_encode(['success' => true, 'data' => ['id' => $newId, 'slug' => $slug]]);
            break;
        }

        // ─── UPDATE (auto-save) ───────────────────────────────────────────────
        case 'update': {
            $allowedFields = ['name','slug','status','blocks_json','settings_json','thank_you_page','cover_style',
                              'target_list_id','flow_trigger_id','response_limit','close_at','require_login',
                              'allow_anonymous','one_per_email'];
            $sets = []; $params = [];
            foreach ($allowedFields as $f) {
                if (!array_key_exists($f, $input)) continue;
                $val = in_array($f, ['blocks_json','settings_json','thank_you_page','cover_style'])
                    ? json_encode($input[$f]) : $input[$f];
                $sets[]   = "`$f` = ?";
                $params[] = $val;
            }
            if (empty($sets)) { echo json_encode(['success' => true, 'message' => 'Nothing to update']); break; }
            $params[] = $id;
            $params[] = $workspace_id;
            $pdo->prepare("UPDATE surveys SET " . implode(', ', $sets) . " WHERE id = ? AND workspace_id = ?")->execute($params);

            // [FIX] Auto-sync survey_questions for Analytics
            if (isset($input['blocks_json']) && is_array($input['blocks_json'])) {
                $blocks = $input['blocks_json'];
                $pdo->prepare("DELETE FROM survey_questions WHERE survey_id = ?")->execute([$id]);
                $qStmt = $pdo->prepare("INSERT INTO survey_questions (id, survey_id, block_id, type, label, options_json, required, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $order = 0;
                foreach ($blocks as $b) {
                    $isLayout = in_array($b['type'] ?? '', ['section_header', 'image_block', 'divider', 'page_break', 'button_block', 'link_block', 'banner_block']);
                    if (!$isLayout) {
                        $opts = isset($b['options']) ? json_encode($b['options']) : null;
                        $req = isset($b['required']) && $b['required'] ? 1 : 0;
                        $label = $b['content'] ?? ($b['title'] ?? 'Untitled Question');
                        $blockId = $b['id'] ?? generateUUID();
                        $qStmt->execute([generateUUID(), $id, $blockId, $b['type'] ?? 'unknown', $label, $opts, $req, $order]);
                        $order++;
                    }
                }
            }

            echo json_encode(['success' => true]);
            break;
        }

        // ─── PUBLISH ─────────────────────────────────────────────────────────
        case 'publish': {
            $pdo->prepare("UPDATE surveys SET status = 'active' WHERE id = ? AND workspace_id = ?")->execute([$id, $workspace_id]);
            echo json_encode(['success' => true, 'message' => 'Survey published']);
            break;
        }

        // ─── PAUSE ───────────────────────────────────────────────────────────
        case 'pause': {
            $pdo->prepare("UPDATE surveys SET status = 'paused' WHERE id = ? AND workspace_id = ?")->execute([$id, $workspace_id]);
            echo json_encode(['success' => true]);
            break;
        }

        // ─── DELETE ──────────────────────────────────────────────────────────
        case 'delete': {
            $stmtOwn = $pdo->prepare("SELECT id FROM surveys WHERE id = ? AND workspace_id = ?");
            $stmtOwn->execute([$id, $workspace_id]);
            if (!$stmtOwn->fetchColumn()) {
                echo json_encode(['success' => false, 'error' => 'Not found or forbidden']);
                break;
            }
            $pdo->prepare("DELETE FROM survey_answer_details WHERE survey_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM survey_responses WHERE survey_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM survey_questions WHERE survey_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM surveys WHERE id = ?")->execute([$id]);
            echo json_encode(['success' => true]);
            break;
        }

        // ─── QR CODE ─────────────────────────────────────────────────────────
        case 'qr': {
            $stmt = $pdo->prepare("SELECT slug FROM surveys WHERE id = ? AND workspace_id = ?");
            $stmt->execute([$id, $workspace_id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) { http_response_code(404); echo json_encode(['success' => false]); exit; }

            $surveyUrl = rtrim($_SERVER['HTTP_HOST'] === 'localhost'
                ? 'http://localhost:5173' : 'https://' . $_SERVER['HTTP_HOST'], '/') . '/s/' . $row['slug'];
            $size = (int)($_GET['size'] ?? 300);

            // Use Google Charts API as QR generator (no library needed)
            $qrApiUrl = "https://chart.googleapis.com/chart?chs={$size}x{$size}&cht=qr&chl=" . urlencode($surveyUrl) . "&choe=UTF-8";
            header('Content-Type: application/json');
            echo json_encode(['success' => true, 'data' => ['url' => $surveyUrl, 'qr_image_url' => $qrApiUrl, 'slug' => $row['slug']]]);
            break;
        }

        // ─── RESPONSES LIST ───────────────────────────────────────────────────
        case 'responses': {
            $stmtOwn = $pdo->prepare("SELECT id FROM surveys WHERE id = ? AND workspace_id = ?");
            $stmtOwn->execute([$id, $workspace_id]);
            if (!$stmtOwn->fetchColumn()) {
                echo json_encode(['success' => false, 'error' => 'Not found or forbidden']);
                break;
            }

            $page  = max(1, (int)($_GET['page'] ?? 1));
            $limit = min(100, (int)($_GET['limit'] ?? 20));
            $offset = ($page - 1) * $limit;

            $totalStmt = $pdo->prepare("SELECT COUNT(*) FROM survey_responses WHERE survey_id = ?");
            $totalStmt->execute([$id]);
            $total = (int)$totalStmt->fetchColumn();

            $stmt = $pdo->prepare("
                SELECT r.*,
                    s.email AS subscriber_email,
                    COALESCE(s.first_name, s.name) AS subscriber_name
                FROM survey_responses r
                LEFT JOIN subscribers s ON s.id = r.subscriber_id
                WHERE r.survey_id = ?
                ORDER BY r.submitted_at DESC
                LIMIT ? OFFSET ?
            ");
            $stmt->execute([$id, $limit, $offset]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as &$row) {
                $row['answers'] = json_decode($row['answers_json'], true);
                unset($row['answers_json']);
            }
            echo json_encode(['success' => true, 'data' => $rows, 'total' => $total, 'page' => $page, 'limit' => $limit]);
            break;
        }

        // ─── ANALYTICS ───────────────────────────────────────────────────────
        case 'analytics': {
            $stmtOwn = $pdo->prepare("SELECT id FROM surveys WHERE id = ? AND workspace_id = ?");
            $stmtOwn->execute([$id, $workspace_id]);
            if (!$stmtOwn->fetchColumn()) {
                echo json_encode(['success' => false, 'error' => 'Not found or forbidden']);
                break;
            }

            $surveyId = $id;

            // Overview stats
            $overview = $pdo->prepare("
                SELECT
                    COUNT(*) AS total_responses,
                    ROUND(AVG(completion_rate), 1) AS avg_completion_rate,
                    ROUND(AVG(time_spent_sec), 0) AS avg_time_spent_sec,
                    SUM(source_channel = 'qr_code') AS qr_count,
                    SUM(source_channel = 'direct_link') AS direct_count,
                    SUM(source_channel = 'email_embed') AS email_count,
                    SUM(source_channel = 'widget') AS widget_count,
                    SUM(source_channel = 'api') AS api_count,
                    SUM(device_type = 'mobile') AS mobile_count,
                    SUM(device_type = 'desktop') AS desktop_count,
                    SUM(device_type = 'tablet') AS tablet_count
                FROM survey_responses
                WHERE survey_id = ?
            ");
            $overview->execute([$surveyId]);
            $overviewData = $overview->fetch(PDO::FETCH_ASSOC);

            // Add country distribution
            $countriesStmt = $pdo->prepare("SELECT geo_country as country, COUNT(*) as count FROM survey_responses WHERE survey_id = ? AND geo_country IS NOT NULL GROUP BY geo_country ORDER BY count DESC LIMIT 10");
            $countriesStmt->execute([$surveyId]);
            $overviewData['countries'] = $countriesStmt->fetchAll(PDO::FETCH_ASSOC);

            // Responses by date (last 30 days)
            $byDate = $pdo->prepare("
                SELECT DATE(submitted_at) AS date, COUNT(*) AS count
                FROM survey_responses
                WHERE survey_id = ? AND submitted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY DATE(submitted_at)
                ORDER BY date ASC
            ");
            $byDate->execute([$surveyId]);
            $byDateData = $byDate->fetchAll(PDO::FETCH_ASSOC);

            // Per-question aggregation
            $questions = $pdo->prepare("SELECT * FROM survey_questions WHERE survey_id = ? ORDER BY order_index");
            $questions->execute([$surveyId]);
            $questionsData = $questions->fetchAll(PDO::FETCH_ASSOC);

            $questionAnalytics = [];
            foreach ($questionsData as $q) {
                $qa = ['question_id' => $q['block_id'], 'block_id' => $q['block_id'], 'type' => $q['type'], 'label' => $q['label'], 'content' => $q['content'], 'options' => $q['options']];

                // Count answered
                $answeredStmt = $pdo->prepare("SELECT COUNT(*) FROM survey_answer_details WHERE question_id = ?");
                $answeredStmt->execute([$q['block_id']]);
                $qa['total_answered'] = (int)$answeredStmt->fetchColumn();

                if (in_array($q['type'], ['star_rating', 'nps', 'slider', 'likert'])) {
                    $ratingStmt = $pdo->prepare("SELECT answer_num, COUNT(*) AS cnt FROM survey_answer_details WHERE question_id = ? AND answer_num IS NOT NULL GROUP BY answer_num ORDER BY answer_num");
                    $ratingStmt->execute([$q['block_id']]);
                    $dist = $ratingStmt->fetchAll(PDO::FETCH_ASSOC);
                    $qa['rating_distribution'] = array_map(fn($r) => ['value' => (float)$r['answer_num'], 'count' => (int)$r['cnt']], $dist);
                    $qa['avg_rating'] = count($dist) ? round(array_sum(array_column($dist, 'answer_num')) / array_sum(array_column($dist, 'cnt')), 2) : null;

                    if ($q['type'] === 'nps') {
                        $promoters  = array_sum(array_column(array_filter($dist, fn($r) => $r['answer_num'] >= 9), 'cnt'));
                        $detractors = array_sum(array_column(array_filter($dist, fn($r) => $r['answer_num'] <= 6), 'cnt'));
                        $total      = $qa['total_answered'] ?: 1;
                        $qa['promoters']  = $promoters;
                        $qa['detractors'] = $detractors;
                        $qa['passives']   = $total - $promoters - $detractors;
                        $qa['nps_score']  = round(($promoters / $total - $detractors / $total) * 100);
                    }
                } elseif (in_array($q['type'], ['single_choice', 'multi_choice', 'dropdown', 'yes_no'])) {
                    // Mọi người có thể submit nhiều options dưới dạng JSON (mảng string)
                    $choiceJsonStmt = $pdo->prepare("SELECT answer_json, answer_text FROM survey_answer_details WHERE question_id = ?");
                    $choiceJsonStmt->execute([$q['block_id']]);
                    $rawChoices = $choiceJsonStmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    $counts = [];
                    foreach ($rawChoices as $rc) {
                        if (!empty($rc['answer_json'])) {
                            $arr = json_decode($rc['answer_json'], true);
                            if (is_array($arr)) {
                                foreach ($arr as $val) {
                                    $counts[$val] = ($counts[$val] ?? 0) + 1;
                                }
                            }
                        } elseif (!empty($rc['answer_text'])) {
                            $val = $rc['answer_text'];
                            $counts[$val] = ($counts[$val] ?? 0) + 1;
                        }
                    }
                    
                    $choices = [];
                    foreach ($counts as $lbl => $cnt) {
                        $choices[] = ['label' => (string)$lbl, 'cnt' => $cnt];
                    }
                    usort($choices, fn($a, $b) => $b['cnt'] <=> $a['cnt']);
                    
                    $total   = $qa['total_answered'] ?: 1;
                    $qa['choice_distribution'] = array_map(fn($c) => [
                        'label' => $c['label'], 'count' => (int)$c['cnt'],
                        'percentage' => round($c['cnt'] / $total * 100, 1)
                    ], $choices);
                } elseif (in_array($q['type'], ['short_text', 'long_text', 'email', 'phone', 'number', 'website', 'date'])) {
                    $textStmt = $pdo->prepare("SELECT answer_text FROM survey_answer_details WHERE question_id = ? AND answer_text IS NOT NULL LIMIT 50");
                    $textStmt->execute([$q['block_id']]);
                    $qa['text_responses'] = $textStmt->fetchAll(PDO::FETCH_COLUMN);
                } elseif (in_array($q['type'], ['matrix_single', 'matrix_multi', 'ranking'])) {
                    $jsonStmt = $pdo->prepare("SELECT answer_json FROM survey_answer_details WHERE question_id = ? AND answer_json IS NOT NULL LIMIT 50");
                    $jsonStmt->execute([$q['block_id']]);
                    $qa['text_responses'] = $jsonStmt->fetchAll(PDO::FETCH_COLUMN);
                }
                $questionAnalytics[] = $qa;
            }

            echo json_encode([
                'success' => true,
                'data' => [
                    'overview'  => $overviewData,
                    'by_date'   => $byDateData,
                    'questions' => $questionAnalytics,
                ]
            ]);
            break;
        }

        // ─── EXPORT CSV ───────────────────────────────────────────────────────
        case 'export': {
            $format = $_GET['format'] ?? 'csv';
            $stmt = $pdo->prepare("
                SELECT r.submitted_at, r.source_channel, r.device_type, r.time_spent_sec,
                       r.completion_rate, r.geo_country, r.geo_city,
                       s.email AS subscriber_email, COALESCE(s.first_name, s.name) AS subscriber_name,
                       r.answers_json
                FROM survey_responses r
                LEFT JOIN subscribers s ON s.id = r.subscriber_id
                WHERE r.survey_id = ?
                ORDER BY r.submitted_at DESC
            ");
            $stmt->execute([$id]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="survey-responses-' . date('Ymd') . '.csv"');
            $out = fopen('php://output', 'w');
            fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF)); // UTF-8 BOM
            if (!empty($rows)) {
                $headers = ['Thời gian', 'Email', 'Tên', 'Kênh', 'Thiết bị', 'Thời gian điền (s)', 'Hoàn thành %', 'Quốc gia', 'Thành phố'];
                // Add question columns from first answer
                $firstAnswers = json_decode($rows[0]['answers_json'], true) ?? [];
                foreach ($firstAnswers as $ans) { $headers[] = $ans['label'] ?? $ans['block_id']; }
                fputcsv($out, $headers);

                foreach ($rows as $row) {
                    $answers = json_decode($row['answers_json'], true) ?? [];
                    $csvRow = [
                        $row['submitted_at'], $row['subscriber_email'] ?? '', $row['subscriber_name'] ?? '',
                        $row['source_channel'], $row['device_type'], $row['time_spent_sec'],
                        $row['completion_rate'], $row['geo_country'] ?? '', $row['geo_city'] ?? ''
                    ];
                    foreach ($answers as $ans) {
                        $val = $ans['answer_text'] ?? $ans['answer_num'] ?? (is_array($ans['answer_json'] ?? null) ? implode(', ', $ans['answer_json']) : '');
                        $csvRow[] = $val;
                    }
                    fputcsv($out, $csvRow);
                }
            }
            fclose($out);
            exit;
        }

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Unknown action']);
    }
} catch (Exception $e) {
    error_log('Survey API Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error', 'message' => 'Lỗi hệ thống, vui lòng thử lại.']);
}

function generateUUID(): string {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff));
}
