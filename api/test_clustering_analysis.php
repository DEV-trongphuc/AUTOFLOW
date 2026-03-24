<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

// PARAMS
$propertyId = $_GET['property_id'] ?? null;
$days = (int) ($_GET['days'] ?? 7);
$threshold = (float) ($_GET['threshold'] ?? 0.35);

if (!$propertyId) {
    die("Missing property_id");
}

$fromDate = date('Y-m-d', strtotime("-$days days"));
$toDate = date('Y-m-d');

echo "--- CLUSTERING ANALYSIS TEST ---\n";
echo "Property ID: $propertyId\n";
echo "Date Range: $fromDate to $toDate\n";
echo "Clustering Threshold: $threshold\n";
echo "---------------------------------\n\n";

// 1. FETCH MESSAGES (Re-using inclusive logic)
$queries = [];
$allParams = [];
$source = $_GET['source'] ?? 'all';

// Web
if ($source === 'all' || $source === 'web') {
    $qWeb = "SELECT m.message as content, c.visitor_id FROM ai_messages m 
          JOIN ai_conversations c ON m.conversation_id = c.id 
          WHERE c.property_id = ? AND m.sender = 'visitor' 
          AND c.visitor_id NOT LIKE 'zalo_%' AND c.visitor_id NOT LIKE 'meta_%'
          AND m.created_at >= ? AND m.created_at <= ?";
    $queries[] = "($qWeb)";
    $allParams = array_merge($allParams, [$propertyId, $fromDate . ' 00:00:00', $toDate . ' 23:59:59']);
}

// Zalo
if ($source === 'all' || $source === 'zalo') {
    $qZalo = "SELECT m.message_text as content, CONCAT('zalo_', m.zalo_user_id) as visitor_id FROM zalo_user_messages m 
          WHERE m.direction = 'inbound'
          AND (
            CONCAT('zalo_', m.zalo_user_id) IN (SELECT visitor_id FROM ai_conversations WHERE property_id = ? AND visitor_id LIKE 'zalo_%') 
            OR m.zalo_user_id IN (SELECT s.zalo_user_id FROM zalo_subscribers s 
                                         JOIN ai_conversations c ON c.visitor_id = CONCAT('zalo_', s.zalo_user_id) 
                                         WHERE c.property_id = ?) 
          )
          AND m.created_at >= ? AND m.created_at <= ?";
    $queries[] = "($qZalo)";
    $allParams = array_merge($allParams, [$propertyId, $propertyId, $fromDate . ' 00:00:00', $toDate . ' 23:59:59']);
}

// Meta
if ($source === 'all' || $source === 'meta') {
    $qMeta = "SELECT m.content as content, CONCAT('meta_', m.psid) as visitor_id FROM meta_message_logs m 
          WHERE m.direction = 'inbound'
          AND (
            CONCAT('meta_', m.psid) IN (SELECT visitor_id FROM ai_conversations WHERE property_id = ? AND visitor_id LIKE 'meta_%') 
            OR m.page_id IN (SELECT DISTINCT mc.page_id FROM meta_conversations mc 
                                     JOIN ai_conversations c ON c.visitor_id = CONCAT('meta_', mc.psid) 
                                     WHERE c.property_id = ?) 
          )
          AND m.created_at >= ? AND m.created_at <= ?";
    $queries[] = "($qMeta)";
    $allParams = array_merge($allParams, [$propertyId, $propertyId, $fromDate . ' 00:00:00', $toDate . ' 23:59:59']);
}

$fullSql = implode(" UNION ALL ", $queries);
$stmt = $pdo->prepare($fullSql);
$stmt->execute($allParams);
$rawMessages = $stmt->fetchAll(PDO::FETCH_ASSOC);

// --- PRE-FILTER NOISE & DEDUPLICATION ---
$texts = [];
$seenVisitorMsg = []; // Deduplicate same message from SAME visitor

foreach ($rawMessages as $m) {
    $content = trim($m['content']);
    $vId = $m['visitor_id'];

    // 1. Skip technical JSON / Templates
    if (strpos($content, '{"') === 0 || strpos($content, '[{') === 0)
        continue;

    // 2. Skip repetitive gibberish (e.g. Qqqq, Q q q)
    $compact = str_replace(' ', '', mb_strtolower($content));
    if (preg_match('/(.)\1{2,}/u', $compact))
        continue;

    // 3. Skip very short noise
    if (mb_strlen($content) < 3)
        continue;

    // 4. [CRITICAL] Deduplicate: One unique content per visitor
    // This removes the "70-tin Lưu Tường" issue if it's the same person submitting multiple times
    $msgKey = md5($content . '|' . $vId);
    if (isset($seenVisitorMsg[$msgKey]))
        continue;
    $seenVisitorMsg[$msgKey] = true;

    $texts[] = $content;
}

echo "TOTAL MESSAGES AFTER DEDUPLICATION & FILTER: " . count($texts) . " (Filtered " . (count($rawMessages) - count($texts)) . " entries)\n\n";

if (empty($texts)) {
    die("No messages found.");
}

// ---------------------------------------------------------
// 🔥 USER PROVIDED LOGIC
// ---------------------------------------------------------

// 1️⃣ Chuẩn hoá + tokenize tiếng Việt
function normalize_text($text)
{
    if (!$text)
        return "";
    $text = mb_strtolower($text, 'UTF-8');
    $text = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $text);
    $text = preg_replace('/\s+/u', ' ', $text);
    return trim($text);
}

function tokenize($text)
{
    return preg_split('/\s+/u', normalize_text($text), -1, PREG_SPLIT_NO_EMPTY);
}

// 2️⃣ Vector hoá tin nhắn bằng TF-IDF
function build_tfidf_vectors($messages)
{
    $docCount = count($messages);
    $termDocFreq = [];
    $docTerms = [];

    foreach ($messages as $i => $msg) {
        $tokens = array_unique(tokenize($msg));
        $docTerms[$i] = $tokens;

        foreach ($tokens as $t) {
            $termDocFreq[$t] = ($termDocFreq[$t] ?? 0) + 1;
        }
    }

    $vectors = [];

    foreach ($messages as $i => $msg) {
        $tokens = tokenize($msg);
        $tf = array_count_values($tokens);

        $vec = [];
        foreach ($tf as $term => $freq) {
            $idf = log($docCount / ($termDocFreq[$term] ?? 1));
            $vec[$term] = $freq * $idf;
        }
        $vectors[$i] = $vec;
    }

    return $vectors;
}

// 3️⃣ Cosine similarity giữa 2 tin nhắn
function cosine_similarity($a, $b)
{
    $dot = 0;
    $normA = 0;
    $normB = 0;

    foreach ($a as $k => $v) {
        $normA += $v * $v;
        if (isset($b[$k])) {
            $dot += $v * $b[$k];
        }
    }

    foreach ($b as $v) {
        $normB += $v * $v;
    }

    if ($normA == 0 || $normB == 0)
        return 0;
    return $dot / (sqrt($normA) * sqrt($normB));
}

// 4️⃣ Gom cụm chủ đề tự động (không cần biết trước số topic)
function cluster_messages($vectors, $threshold = 0.35)
{
    $clusters = [];

    foreach ($vectors as $i => $vec) {
        $placed = false;

        foreach ($clusters as &$cluster) {
            $sim = cosine_similarity($vec, $cluster['centroid']);
            if ($sim >= $threshold) {
                $cluster['items'][] = $i;

                foreach ($vec as $k => $v) {
                    $cluster['centroid'][$k] = ($cluster['centroid'][$k] ?? 0) + $v;
                }

                $placed = true;
                break;
            }
        }

        if (!$placed) {
            $clusters[] = [
                'items' => [$i],
                'centroid' => $vec
            ];
        }
    }

    return $clusters;
}

// 5️⃣ Lấy tin nhắn “được quan tâm nhất” trong mỗi chủ đề
function get_representative_messages($clusters, $vectors, $messages)
{
    $topics = [];

    foreach ($clusters as $cluster) {
        $bestScore = 0;
        $bestMsg = null;

        foreach ($cluster['items'] as $i) {
            $sim = cosine_similarity($vectors[$i], $cluster['centroid']);
            if ($sim > $bestScore) {
                $bestScore = $sim;
                $bestMsg = $messages[$i];
            }
        }

        $topics[] = [
            'topic_size' => count($cluster['items']),
            'representative_message' => $bestMsg
        ];
    }

    usort($topics, fn($a, $b) => $b['topic_size'] <=> $a['topic_size']);

    return $topics;
}

// --- EXECUTE ---
$start = microtime(true);
$vectors = build_tfidf_vectors($texts);
$clusters = cluster_messages($vectors, $threshold);
$topics = get_representative_messages($clusters, $vectors, $texts);
$end = microtime(true);

echo "ANALYSIS COMPLETED IN " . round($end - $start, 4) . " SECONDS.\n\n";

// 🏆 ADDED: TOP 20 KEYWORDS BY TF-IDF WEIGHT
$globalTFWeight = [];
foreach ($vectors as $vec) {
    foreach ($vec as $term => $weight) {
        $globalTFWeight[$term] = ($globalTFWeight[$term] ?? 0) + $weight;
    }
}
arsort($globalTFWeight);

echo "TOP 20 KEYWORDS (By TF-IDF Weight):\n";
$kwIdx = 1;
foreach (array_slice($globalTFWeight, 0, 20) as $kw => $w) {
    printf("%2d. %-20s (%.2f)\n", $kwIdx++, $kw, $w);
}
echo "---------------------------------\n\n";

echo "TOPICS FOUND (By Clustering):\n";
foreach ($topics as $idx => $t) {
    if ($idx >= 15)
        break;
    $percent = round(($t['topic_size'] / count($texts)) * 100, 1);

    // Display short version of representative message if too long
    $displayMsg = $t['representative_message'];
    if (mb_strlen($displayMsg) > 200) {
        $displayMsg = mb_substr($displayMsg, 0, 200) . "...";
    }

    printf(
        "%2d. [%-4d tin - %5s%%]: %s\n",
        $idx + 1,
        $t['topic_size'],
        $percent,
        str_replace(["\n", "\r"], ' ', $displayMsg)
    );
}

echo "\n--- END OF TEST ---\n";
