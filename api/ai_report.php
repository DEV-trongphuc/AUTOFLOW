<?php
require_once 'db_connect.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$period = $_GET['period'] ?? 'month'; // month, week, day

// Helpers
function getRange($period)
{
    if ($period === 'week')
        return [date('Y-m-d', strtotime('-7 days')), date('Y-m-d')];
    if ($period === 'day')
        return [date('Y-m-d', strtotime('-1 day')), date('Y-m-d')];
    if (!empty($_GET['start_date']) && !empty($_GET['end_date']))
        return [$_GET['start_date'], $_GET['end_date']];
    return [date('Y-m-01'), date('Y-m-t')]; // Default month
}

list($start, $end) = getRange($period);
$property_id = $_GET['property_id'] ?? '';

$propFilterConvs = "";
$propFilterMsgs = "";
if (!empty($property_id)) {
    $propFilterConvs = " AND property_id = ?";
    $propFilterMsgs = " AND conversation_id IN (SELECT id FROM ai_conversations WHERE property_id = ?)";
}

if ($method === 'GET' && $action === 'summary') {
    try {
        // 1. Total Conversations
        $paramConvs = [$start, $end . ' 23:59:59'];
        if (!empty($property_id)) $paramConvs[] = $property_id;

        $sqlTotal = "SELECT COUNT(*) FROM ai_conversations WHERE created_at BETWEEN ? AND ?" . $propFilterConvs;
        $stmt = $pdo->prepare($sqlTotal);
        $stmt->execute($paramConvs);
        $totalConvs = $stmt->fetchColumn();

        // 2. AI Replies
        $paramMsgs = [$start, $end . ' 23:59:59'];
        if (!empty($property_id)) $paramMsgs[] = $property_id;

        $sqlAI = "SELECT COUNT(*) FROM ai_messages WHERE sender='ai' AND created_at BETWEEN ? AND ?" . $propFilterMsgs;
        $stmt = $pdo->prepare($sqlAI);
        $stmt->execute($paramMsgs);
        $aiReplies = $stmt->fetchColumn();

        // 3. Human Handovers (Conversations that have at least one human reply)
        $sqlHandover = "SELECT COUNT(DISTINCT conversation_id) FROM ai_messages WHERE sender='human' AND created_at BETWEEN ? AND ?" . $propFilterMsgs;
        $stmt = $pdo->prepare($sqlHandover);
        $stmt->execute($paramMsgs);
        $handovers = $stmt->fetchColumn();

        // 4. Unanswered (Visitor sent last message > 2 hours ago)
        $unanswered = 0; // Placeholder for optimization

        echo json_encode([
            'success' => true,
            'data' => [
                'total_conversations' => $totalConvs,
                'ai_replies' => $aiReplies,
                'human_handovers' => $handovers,
                'unanswered' => $unanswered
            ]
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

if ($method === 'GET' && $action === 'chart') {
    try {
        $format = '%Y-%m-%d';
        if ($period === 'month' && ((strtotime($end) - strtotime($start)) > 32 * 86400))
            $format = '%Y-%m';

        $sql = "SELECT DATE_FORMAT(created_at, '$format') as date, 
                SUM(CASE WHEN sender = 'ai' THEN 1 ELSE 0 END) as ai_count,
                SUM(CASE WHEN sender = 'visitor' THEN 1 ELSE 0 END) as visitor_count,
                SUM(CASE WHEN sender = 'human' THEN 1 ELSE 0 END) as human_count
                FROM ai_messages 
                WHERE created_at BETWEEN ? AND ?" . $propFilterMsgs . " 
                GROUP BY date 
                ORDER BY date ASC";

        $stmt = $pdo->prepare($sql);
        $paramChart = [$start, $end . ' 23:59:59'];
        if (!empty($property_id)) $paramChart[] = $property_id;
        $stmt->execute($paramChart);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>