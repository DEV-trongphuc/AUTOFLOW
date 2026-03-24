<?php
require_once 'db_connect.php';
header('Content-Type: text/plain; charset=utf-8');

$propertyId = $_GET['property_id'] ?? null;
$source = $_GET['source'] ?? 'web';
$days = (int) ($_GET['days'] ?? 7);

if (!$propertyId) {
      die("Error: Missing property_id parameter.\nUsage: debug_ai_messages_fetch.php?property_id=YOUR_ID&source=web&days=7");
}

$fromDate = date('Y-m-d', strtotime("-$days days"));
$toDate = date('Y-m-d');

echo "--- FINAL INCLUSIVE ANALYSIS QUERY (Same as ai_chatbot) ---\n";
$queries = [];
$allParams = [];

// 1. WEB
$qWeb = "SELECT m.message as content, m.created_at, 'web' as platform, c.visitor_id 
      FROM ai_messages m 
      JOIN ai_conversations c ON m.conversation_id = c.id 
      WHERE c.property_id = ? AND m.sender = 'visitor' 
      AND c.visitor_id NOT LIKE 'zalo_%' AND c.visitor_id NOT LIKE 'meta_%'";
$pWeb = [$propertyId];
$qWeb .= " AND m.created_at >= ? AND m.created_at <= ?";
$pWeb[] = $fromDate . ' 00:00:00';
$pWeb[] = $toDate . ' 23:59:59';
$queries[] = "($qWeb)";
$allParams = array_merge($allParams, $pWeb);

// 2. ZALO (Inclusive)
$qZalo = "SELECT m.message_text as content, m.created_at, 'zalo' as platform, CONCAT('zalo_', m.zalo_user_id) as visitor_id 
      FROM zalo_user_messages m 
      WHERE m.direction = 'inbound'
      AND (
        CONCAT('zalo_', m.zalo_user_id) IN (SELECT visitor_id FROM ai_conversations WHERE property_id = ? AND visitor_id LIKE 'zalo_%') 
        OR m.zalo_user_id IN (SELECT s.zalo_user_id FROM zalo_subscribers s 
                                     JOIN ai_conversations c ON c.visitor_id = CONCAT('zalo_', s.zalo_user_id) 
                                     WHERE c.property_id = ?) 
      )";
$pZalo = [$propertyId, $propertyId];
$qZalo .= " AND m.created_at >= ? AND m.created_at <= ?";
$pZalo[] = $fromDate . ' 00:00:00';
$pZalo[] = $toDate . ' 23:59:59';
$queries[] = "($qZalo)";
$allParams = array_merge($allParams, $pZalo);

// 3. META (Inclusive)
$qMeta = "SELECT m.content as content, m.created_at, 'meta' as platform, CONCAT('meta_', m.psid) as visitor_id 
      FROM meta_message_logs m 
      WHERE m.direction = 'inbound'
      AND (
        CONCAT('meta_', m.psid) IN (SELECT visitor_id FROM ai_conversations WHERE property_id = ? AND visitor_id LIKE 'meta_%') 
        OR m.page_id IN (SELECT DISTINCT mc.page_id FROM meta_conversations mc 
                                 JOIN ai_conversations c ON c.visitor_id = CONCAT('meta_', mc.psid) 
                                 WHERE c.property_id = ?) 
      )";
$pMeta = [$propertyId, $propertyId];
$qMeta .= " AND m.created_at >= ? AND m.created_at <= ?";
$pMeta[] = $fromDate . ' 00:00:00';
$pMeta[] = $toDate . ' 23:59:59';
$queries[] = "($qMeta)";
$allParams = array_merge($allParams, $pMeta);

$fullSql = implode(" UNION ALL ", $queries);
$countSql = "SELECT COUNT(*) as total FROM ($fullSql) as t";
$stmt = $pdo->prepare($countSql);
$stmt->execute($allParams);
$total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
echo "TOTAL MESSAGES MATCHING FILTERS: $total\n";
echo "AI WILL PICK: " . min($total, 500) . " random messages for analysis.\n\n";

echo "SAMPLE OF 10 RANDOM MESSAGES (That AI might pick):\n";
$randSql = "SELECT * FROM ($fullSql) as t ORDER BY RAND() LIMIT 10";
$stmt = $pdo->prepare($randSql);
$stmt->execute($allParams);
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
      echo "[{$row['created_at']}] [{$row['platform']}]: " . mb_substr($row['content'], 0, 80) . "...\n";
}
echo "\n";

$daySql = "SELECT DATE(created_at) as d, platform, COUNT(*) as c FROM ($fullSql) as t GROUP BY d, platform ORDER BY d DESC, platform ASC";
$stmt = $pdo->prepare($daySql);
$stmt->execute($allParams);
echo "BREAKDOWN PER DAY & PLATFORM:\n";
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
      echo "- {$row['d']} [{$row['platform']}]: {$row['c']} tin nhắn\n";
}

echo "\n--- END OF DEBUG ---\n";
