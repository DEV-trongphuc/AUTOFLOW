<?php
// api/chat_rag.php – Optimized Hybrid Search with Boosting

function fastCosineSimilarity($vecQ, $vecB, $normQ, $normB)
{
    if ($normQ == 0 || $normB == 0)
        return 0;
    $dotProduct = 0;
    foreach ($vecQ as $i => $val) {
        if (isset($vecB[$i])) {
            $dotProduct += $val * $vecB[$i];
        }
    }
    return $dotProduct / ($normQ * $normB);
}

function getEmbedding($pdo, $text, $apiKey)
{
    if (empty($apiKey))
        return ['error' => 'No API Key.'];
    $hash = md5($text);
    try {
        $stmt = $pdo->prepare("SELECT vector_binary, vector FROM ai_vector_cache WHERE hash = ? AND created_at >= NOW() - INTERVAL 7 DAY LIMIT 1");
        $stmt->execute([$hash]);
        $cached = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($cached) {
            if (!empty($cached['vector_binary'])) {
                return array_values(unpack('f*', $cached['vector_binary']));
            }
            return json_decode($cached['vector'], true);
        }
    } catch (Exception $e) {
    }

    $url = "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";
    $payload = ["content" => ["parts" => [["text" => $text]]]];
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'X-goog-api-key: ' . $apiKey]);
    $response = curl_exec($ch);
    $res = json_decode($response, true);
    $vector = $res['embedding']['values'] ?? null;
    if ($vector) {
        $packed = pack('f*', ...$vector);
        try {
            $pdo->prepare("INSERT INTO ai_vector_cache (hash, vector, vector_binary, created_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE vector=VALUES(vector), vector_binary=VALUES(vector_binary), created_at=NOW()")->execute([$hash, json_encode($vector), $packed]);
        } catch (Exception $e) {
        }
    }
    return $vector ?: ['error' => 'API Error'];
}

// --- HELPER: Query Expansion to fix short/ambiguous queries ---
function expandQueryForRAG($pdo, $propertyId, $q, $context)
{
    $qLower = mb_strtolower($q);
    $lastUser = $context['last_user_msg'] ?? '';
    $lastUserLower = mb_strtolower($lastUser);
    $lastBot = $context['last_bot_msg'] ?? '';

    // 1. Tự động lấy danh sách "Thực thể" (Tiêu đề tài liệu) từ Database
    // Đây là chìa khóa để hệ thống thông minh mà không cần fix cứng.
    $docNames = [];
    try {
        $stmt = $pdo->prepare("SELECT name FROM ai_training_docs WHERE property_id = ? AND is_active = 1 AND source_type != 'folder' LIMIT 20");
        $stmt->execute([$propertyId]);
        $docNames = $stmt->fetchAll(PDO::FETCH_COLUMN);
    } catch (Exception $e) {
    }

    // 2. Nhận diện các Thực thể trong câu hiện tại và câu trước đó
    $currentEntities = [];
    $prevEntities = [];
    foreach ($docNames as $dn) {
        $dnLower = mb_strtolower($dn);
        if (mb_strpos($qLower, $dnLower) !== false)
            $currentEntities[] = $dn;
        if (!empty($lastUserLower) && mb_strpos($lastUserLower, $dnLower) !== false)
            $prevEntities[] = $dn;
    }

    // 3. Xử lý "Chuyển đổi chủ đề" (Topic Switch)
    // Nếu khách bắt đầu nói về một Thực thể mới, ta sẽ loại bỏ Thực thể cũ khỏi ngữ cảnh mở rộng
    // để tránh việc AI bị "lag" bởi thông tin cũ.
    $cleanedLastUser = $lastUser;
    if (!empty($currentEntities)) {
        foreach ($prevEntities as $pe) {
            $isStillRelevant = false;
            foreach ($currentEntities as $ce) {
                if (mb_strtolower($ce) === mb_strtolower($pe))
                    $isStillRelevant = true;
            }
            if (!$isStillRelevant) {
                // Thay thế thực thể cũ bằng khoảng trắng để giữ lại các từ khóa ý định (intent) khác
                $cleanedLastUser = mb_eregi_replace(preg_quote($pe), '', $cleanedLastUser);
            }
        }
    }

    $extra = "";
    // Chỉ mở rộng nếu câu hỏi ngắn (thiếu ngữ cảnh)
    if (mb_strlen($q) < 60) {
        $extra .= " " . $cleanedLastUser;

        // Chỉ đưa nội dung AI vừa nói vào nếu:
        // - Không có thực thể mới nào được nhắc tới (đang hỏi sâu hơn về cái cũ)
        // - Hoặc thực thể mới trùng với thực thể cũ
        $isNewTopic = !empty($currentEntities) && empty($prevEntities); // Case: bỗng nhiên hỏi cái mới
        if (!$isNewTopic || empty($currentEntities)) {
            $extra .= " " . mb_substr($lastBot, 0, 150);
        }
    }

    return trim($q . " " . $extra);
}

function retrieveContext($pdo, $propertyId, $userMsg, $contextParams, $apiKey, $limit = 20)
{
    // Expand query for better embedding semantics
    $expandedQuery = expandQueryForRAG($pdo, $propertyId, $userMsg, $contextParams);
    $cleanQuery = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $expandedQuery);
    $cacheKey = md5($propertyId . '|' . mb_strtolower(trim($cleanQuery)));

    try {
        $stmt = $pdo->prepare("SELECT results FROM ai_rag_search_cache WHERE query_hash = ? AND created_at > (NOW() - INTERVAL 7 DAY) LIMIT 1");
        $stmt->execute([$cacheKey]);
        $cached = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($cached)
            return json_decode($cached['results'], true);
    } catch (Exception $e) {
    }

    $qEmbed = getEmbedding($pdo, $expandedQuery, $apiKey);
    if (isset($qEmbed['error'])) {
        return [
            'results' => [],
            'perf' => ['error' => $qEmbed['error'], 'time_ms' => 0]
        ];
    }

    $normQ = 0;
    foreach ($qEmbed as $v)
        $normQ += $v * $v;
    $normQ = sqrt($normQ);

    $queryWords = array_slice(array_filter(explode(' ', mb_strtolower($cleanQuery)), function ($w) {
        return mb_strlen($w) >= 2;
    }), 0, 8); // Increased to 8 words for better context

    // RELAXED QUERY: Không dùng '+' bắt buộc để tránh việc 'tìm sát từ khóa quá' dẫn đến không ra kết quả.
    // Chuyển sang dùng các từ khóa có dấu '*' để tìm kiếm linh hoạt hơn.
    $relaxedQuery = "";
    foreach ($queryWords as $w) {
        $relaxedQuery .= "$w* ";
    }
    $relaxedQuery = trim($relaxedQuery);

    // SMART RETRIEVAL: Sử dụng đồng thời cả Natural Language và Boolean (không gò bó) để lấy pool ứng viên rộng nhất.
    $stmt = $pdo->prepare("
            (SELECT c.id, c.doc_id, c.content, c.embedding_binary, c.embedding, c.vector_norm, c.tags, d.name as source_name,
                MATCH(c.content) AGAINST(? IN NATURAL LANGUAGE MODE) as fts_score
            FROM ai_training_chunks c
            JOIN ai_training_docs d ON c.doc_id = d.id
            WHERE c.property_id = ? AND d.is_active = 1
            LIMIT 300)
            UNION
            (SELECT c.id, c.doc_id, c.content, c.embedding_binary, c.embedding, c.vector_norm, c.tags, d.name as source_name,
                MATCH(c.content) AGAINST(? IN BOOLEAN MODE) as fts_score
            FROM ai_training_chunks c
            JOIN ai_training_docs d ON c.doc_id = d.id
            WHERE c.property_id = ? AND d.is_active = 1
            LIMIT 200)
        ");
    $stmt->execute([$userMsg, $propertyId, $relaxedQuery, $propertyId]);
    $rawResults = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // SMART DEDUPLICATION: Khử trùng lặp dựa trên ID và giữ lại bản ghi có FTS Score cao nhất
    $uniqueResults = [];
    foreach ($rawResults as $row) {
        $id = $row['id'];
        if (!isset($uniqueResults[$id]) || $row['fts_score'] > $uniqueResults[$id]['fts_score']) {
            $uniqueResults[$id] = $row;
        }
    }

    // FALLBACK: Luôn lấy thêm 100 bản ghi mới nhất để đảm bảo có pool ứng viên cho Vector Search 
    if (count($uniqueResults) < 100) {
        $stmtFallback = $pdo->prepare("
                SELECT c.id, c.doc_id, c.content, c.embedding_binary, c.embedding, c.vector_norm, c.tags, d.name as source_name,
                    0 as fts_score
                FROM ai_training_chunks c
                JOIN ai_training_docs d ON c.doc_id = d.id
                WHERE c.property_id = ? AND d.is_active = 1
                ORDER BY c.created_at DESC
                LIMIT 100
            ");
        $stmtFallback->execute([$propertyId]);
        $fallbackRows = $stmtFallback->fetchAll(PDO::FETCH_ASSOC);
        foreach ($fallbackRows as $row) {
            if (!isset($uniqueResults[$row['id']])) {
                $uniqueResults[$row['id']] = $row;
            }
        }
    }
    $ftsResults = array_values($uniqueResults);

    $ragStart = microtime(true);
    $binaryCount = 0;
    $jsonCount = 0;

    // --- RRF (Reciprocal Rank Fusion) Implementation ---
    // Instead of linear score combination, we combine ranks.
    // Formula: Score = sum( 1 / (k + rank) )
    $k_rrf = 60; // Standard constant

    // Pre-calculate Vector Scores to avoid redundant json_decode/unpacking in usort
    $scoredResults = [];
    foreach ($ftsResults as $row) {
        if (!empty($row['embedding_binary'])) {
            $vecB = array_values(unpack('f*', $row['embedding_binary']));
            $binaryCount++;
        } else {
            $vecB = json_decode($row['embedding'] ?? '', true);
            if (!is_array($vecB))
                $vecB = []; // Ép kiểu về mảng rỗng nếu json nát
            $jsonCount++;
        }

        $normB = (float) ($row['vector_norm'] ?? 0);
        if ($normB <= 0 && !empty($vecB)) {
            foreach ($vecB as $v)
                $normB += $v * $v;
            $normB = sqrt($normB);
        }

        $row['vector_score'] = (!empty($vecB)) ? fastCosineSimilarity($qEmbed, $vecB, $normQ, $normB) : 0;
        $scoredResults[] = $row;
    }

    // 1. Ranking by Vector Score (Semantic)
    usort($scoredResults, function ($a, $b) {
        return $b['vector_score'] <=> $a['vector_score'];
    });
    $vectorRanks = [];
    foreach ($scoredResults as $i => $row) {
        $vectorRanks[$row['id']] = $i + 1;
    }

    // 2. Ranking by FTS/Keyword Score (Lexical)
    usort($scoredResults, function ($a, $b) {
        return (float) $b['fts_score'] <=> (float) $a['fts_score'];
    });
    $ftsRanks = [];
    foreach ($scoredResults as $i => $row) {
        $ftsRanks[$row['id']] = $i + 1;
    }

    // 3. Combined Results with RRF and Multi-Field Boost
    $candidates = [];
    $qLower = mb_strtolower($userMsg);
    // Reuse query words from top for performance
    $userWords = $queryWords;

    foreach ($scoredResults as $row) {
        $chunkId = $row['id'];

        // Base RRF Score
        $rrfScore = (1.0 / ($k_rrf + $vectorRanks[$chunkId])) + (1.0 / ($k_rrf + $ftsRanks[$chunkId]));

        // --- Cross-Field & Tag Matching (Semantic Multiplier) ---
        $contentLower = mb_strtolower($row['content']);
        $sourceLower = mb_strtolower($row['source_name'] ?? '');
        $tags = json_decode($row['tags'] ?? '[]', true);

        $fieldBoost = 1.0;
        foreach ($userWords as $w) {
            // Title Match (Very High Signal)
            if ($sourceLower !== '' && mb_strpos($sourceLower, $w) !== false) {
                $fieldBoost += 0.5;
            }
            // Tag Match (High Signal)
            if (!empty($tags)) {
                foreach ($tags as $tag) {
                    if (mb_strpos(mb_strtolower($tag), $w) !== false) {
                        $fieldBoost += 0.3;
                        break;
                    }
                }
            }
        }

        $finalScore = $rrfScore * $fieldBoost;
        $normalizedScore = $finalScore * 25.0; // Scale to ~0.8-1.0 range

        $candidates[] = [
            'content' => "SOURCE: [" . $row['source_name'] . "]\n" . $row['content'],
            'score' => $normalizedScore,
            'doc_id' => $row['doc_id'],
            'source_name' => $row['source_name']
        ];
    }

    // Sort by final combined RRF score
    usort($candidates, function ($a, $b) {
        return $b['score'] <=> $a['score'];
    });

    // --- Smart Context Window (Optimized for RRF) ---
    $selectedContext = [];
    if (!empty($candidates)) {
        foreach ($candidates as $index => $c) {
            if ($index >= $limit)
                break; // Hard limit guard

            // Normalized Slope-based Cut-off:
            if ($index >= 3) {
                $prevScore = $candidates[$index - 1]['score'];
                if (($prevScore - $c['score']) > 0.12) { // Adjusted for x25 scale
                    break;
                }
            }

            $selectedContext[] = $c;
        }
    }

    $ragTime = round((microtime(true) - $ragStart) * 1000, 2);
    $perf = [
        'time_ms' => $ragTime,
        'binary_chunks' => $binaryCount,
        'json_chunks' => $jsonCount,
        'cached' => false
    ];

    $output = [
        'results' => $selectedContext,
        'perf' => $perf,
        'max_score' => (!empty($candidates) ? $candidates[0]['score'] : 0)
    ];

    try {
        $cacheStmt = $pdo->prepare("INSERT INTO ai_rag_search_cache (query_hash, results, created_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE results=VALUES(results), created_at=NOW()");
        $cacheStmt->execute([$cacheKey, json_encode($output)]);
    } catch (Exception $cacheE) {
    }

    error_log("RAG PERF (RRF): {$ragTime}ms | Candidates: " . count($scoredResults) . " | Selected: " . count($selectedContext));

    return $output;
}
