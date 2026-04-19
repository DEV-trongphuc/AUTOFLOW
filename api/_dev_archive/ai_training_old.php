<?php
// api/ai_training.php
require_once 'db_connect.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// --- CONFIGURATION ---
set_time_limit(0);
ini_set('memory_limit', '512M');
$GEMINI_API_KEY = getenv('GEMINI_API_KEY') ?: '';

function training_log($msg)
{
    if (is_array($msg) || is_object($msg))
        $msg = json_encode($msg);
    $logFile = __DIR__ . '/training_debug.log';
    $date = date('Y-m-d H:i:s');
    @file_put_contents($logFile, "[$date] $msg\n", FILE_APPEND);
}

training_log("Request: " . $_SERVER['REQUEST_METHOD'] . " action=" . ($_GET['action'] ?? 'none'));

function callGeminiBatchEmbedding($texts, $apiKey)
{
    if (empty($apiKey))
        return ['error' => 'API Key is empty'];

    // Use batchEmbedContents
    $url = "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents";

    $requests = [];
    foreach ($texts as $t) {
        $requests[] = [
            "model" => "models/text-embedding-004",
            "content" => ["parts" => [["text" => $t]]]
        ];
    }

    $payload = ["requests" => $requests];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-goog-api-key: ' . $apiKey
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $result = json_decode($response, true);
    if ($httpCode !== 200) {
        $msg = $result['error']['message'] ?? 'Gemini API Error (HTTP ' . $httpCode . ')';
        return ['error' => $msg];
    }

    if (isset($result['embeddings'])) {
        return $result['embeddings'];
    }
    return ['error' => 'No embeddings returned'];
}

function callGeminiEmbedding($text, $apiKey)
{
    if (empty($apiKey))
        return ['error' => 'API Key is empty'];

    // Use text-embedding-004
    $url = "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";

    $payload = [
        "content" => [
            "parts" => [
                ["text" => $text]
            ]
        ]
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-goog-api-key: ' . $apiKey
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $result = json_decode($response, true);
    if ($httpCode !== 200) {
        $msg = $result['error']['message'] ?? 'Gemini API Error (HTTP ' . $httpCode . ')';
        return ['error' => $msg];
    }

    return $result['embedding']['values'] ?? ['error' => 'Malformed response'];
}

function callGeminiCreateCache($model, $textParts, $ttlSeconds, $apiKey)
{
    if (empty($apiKey))
        return ['error' => 'API Key is empty'];

    $url = "https://generativelanguage.googleapis.com/v1beta/cachedContents?key=" . $apiKey;

    // Construct Payload
    // content should be an array of Content objects
    $payload = [
        "model" => $model,
        "contents" => [
            [
                "role" => "user",
                "parts" => $textParts // Array of ['text' => '...']
            ]
        ],
        "ttl" => $ttlSeconds . "s"
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $result = json_decode($response, true);

    if ($httpCode !== 200 && $httpCode !== 201) {
        return ['error' => $result['error']['message'] ?? 'Cache Creation Failed'];
    }
    return $result; // Returns the cache object (with 'name')
}

// --- HELPER: CHUNKING ---
function chunkText($text, $chunkSize = 400, $overlap = 60)
{
    if (mb_strlen($text) <= $chunkSize) {
        return [$text];
    }

    $chunks = [];
    $length = mb_strlen($text);
    $start = 0;

    while ($start < $length) {
        $maxEnd = min($start + $chunkSize, $length);
        if ($maxEnd >= $length) {
            $chunk = mb_substr($text, $start);
            $chunks[] = trim($chunk);
            break;
        }

        $sub = mb_substr($text, $start, $chunkSize);
        $lastPunct = mb_strrpos($sub, '.');
        $breakPoint = $chunkSize;
        if ($lastPunct !== false && $lastPunct > ($chunkSize * 0.2)) {
            $breakPoint = $lastPunct + 1;
        }

        $chunk = mb_substr($text, $start, $breakPoint);
        $chunks[] = trim($chunk);

        $step = max(1, $breakPoint - $overlap);
        $start += $step;
    }
    return $chunks;
}

/**
 * Precompute Document Frequency (DF) for all terms in property chunks
 * Optimized for BM25 efficiency
 */
function updatePropertyTermStats($pdo, $propertyId)
{
    try {
        // Clear old stats
        $pdo->prepare("DELETE FROM ai_term_stats WHERE property_id = ?")->execute([$propertyId]);

        // Get all chunks (Streamed to save memory)
        $stmt = $pdo->prepare("SELECT content FROM ai_training_chunks WHERE property_id = ?");
        $stmt->execute([$propertyId]);

        $termDf = [];
        while ($content = $stmt->fetch(PDO::FETCH_COLUMN)) {
            $contentLower = mb_strtolower($content);
            $clean = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $contentLower);
            $words = explode(' ', $clean);
            $uniqueWords = [];

            foreach ($words as $w) {
                $w = trim($w);
                if (mb_strlen($w) >= 2 && !isset($uniqueWords[$w])) {
                    $uniqueWords[$w] = true;
                    $termDf[$w] = ($termDf[$w] ?? 0) + 1;
                }
            }
        }

        // Batch insert stats
        if (!empty($termDf)) {
            $pdo->beginTransaction();
            $stmtIns = $pdo->prepare("INSERT INTO ai_term_stats (term, property_id, df) VALUES (?, ?, ?)");
            $count = 0;
            foreach ($termDf as $term => $df) {
                $stmtIns->execute([mb_substr($term, 0, 100), $propertyId, $df]);
                $count++;
                if ($count % 500 === 0) {
                    $pdo->commit();
                    $pdo->beginTransaction();
                }
            }
            if ($pdo->inTransaction())
                $pdo->commit();
        }
    } catch (Exception $e) {
        if ($pdo->inTransaction())
            $pdo->rollBack();
        error_log("updatePropertyTermStats Error: " . $e->getMessage());
    }
}


// --- API ACTIONS ---
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $propertyId = $input['property_id'] ?? ($_POST['property_id'] ?? ($_GET['property_id'] ?? null));

    if ($method === 'GET') {
        if ($action === 'list_all_chatbots') {
            $stmt = $pdo->query("SELECT property_id, bot_name, is_enabled FROM ai_chatbot_settings WHERE is_enabled = 1");
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            exit;
        }

        if (empty($propertyId)) {
            echo json_encode(['success' => false, 'message' => 'property_id required']);
            exit;
        }

        if ($action === 'list_docs') {
            // Updated to load status and priority
            $stmt = $pdo->prepare("SELECT id, property_id, name, source_type, is_active, status, priority, created_at, updated_at, metadata, parent_id, CHAR_LENGTH(content) as content_size 
                                   FROM ai_training_docs 
                                   WHERE property_id = ? 
                                   ORDER BY priority DESC, created_at DESC");
            $stmt->execute([$propertyId]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } elseif ($action === 'get_settings') {
            $stmt = $pdo->prepare("SELECT * FROM ai_chatbot_settings WHERE property_id = ? LIMIT 1");
            $stmt->execute([$propertyId]);
            echo json_encode(['success' => true, 'data' => $stmt->fetch(PDO::FETCH_ASSOC)]);
        } else if ($action === 'get_doc') {
            $id = $_GET['id'] ?? null;
            // ... existing get_doc logic
            $stmt = $pdo->prepare("SELECT * FROM ai_training_docs WHERE id = ? AND property_id = ?");
            $stmt->execute([$id, $propertyId]);
            $doc = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($doc) {
                echo json_encode(['success' => true, 'data' => $doc]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Not found']);
            }

        }
    } elseif ($method === 'POST') {
        if (empty($propertyId)) {
            echo json_encode(['success' => false, 'message' => 'property_id required']);
            exit;
        }
        // --- NEW ACTION: PROCESS TRAINING (Generate Embeddings) ---
        if ($action === 'train_docs') {
            training_log("Starting train_docs. property_id=" . $propertyId);
            $docIds = $input['doc_ids'] ?? []; // Array of doc IDs
            // If empty, maybe train ALL pending
            if (empty($docIds)) {
                $stmt = $pdo->prepare("SELECT id FROM ai_training_docs WHERE property_id = ? AND status = 'pending' AND source_type != 'folder'");
                $stmt->execute([$propertyId]);
                $docIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
                training_log("Found " . count($docIds) . " pending docs to train (excluding folders).");
            } else {
                training_log("Training " . count($docIds) . " specific docs.");
            }

            if (empty($docIds)) {
                training_log("No docs to train. Exiting.");
                echo json_encode(['success' => true, 'message' => 'Nothing to train']);
                exit;
            }

            // INVALIDATE CURRENT CACHE
            training_log("Invalidating Gemini cache and RAG cache.");
            $pdo->prepare("UPDATE ai_chatbot_settings SET gemini_cache_name = NULL, gemini_cache_expires_at = NULL WHERE property_id = ?")->execute([$propertyId]);

            // ALSO CLEAR RAG CACHE for this property to ensure fresh search results
            // We also clear any null/empty property_id entries to clean up older bugged rows
            $pdo->prepare("DELETE FROM ai_rag_search_cache WHERE property_id = ? OR property_id IS NULL OR property_id = ''")->execute([$propertyId]);

            // Clear Query/Embedding Cache for this property (optional, but safer)
            // $pdo->prepare("DELETE FROM ai_vector_cache WHERE created_at < NOW() - INTERVAL 1 DAY")->execute();

            // SELF-HEALING SCHEMA (Point #1, #2, #4)
            try {
                $colsCh = $pdo->query("SHOW COLUMNS FROM ai_training_chunks")->fetchAll(PDO::FETCH_COLUMN);
                if (!in_array('metadata_text', $colsCh))
                    $pdo->exec("ALTER TABLE ai_training_chunks ADD COLUMN metadata_text LONGTEXT AFTER content");
                if (!in_array('embedding_binary', $colsCh))
                    $pdo->exec("ALTER TABLE ai_training_chunks ADD COLUMN embedding_binary LONGBLOB AFTER embedding");
                if (!in_array('vector_norm', $colsCh))
                    $pdo->exec("ALTER TABLE ai_training_chunks ADD COLUMN vector_norm FLOAT DEFAULT 0");
                if (!in_array('priority_level', $colsCh))
                    $pdo->exec("ALTER TABLE ai_training_chunks ADD COLUMN priority_level INT DEFAULT 0");
                if (!in_array('tags', $colsCh))
                    $pdo->exec("ALTER TABLE ai_training_chunks ADD COLUMN tags TEXT DEFAULT NULL");

                $colsSet = $pdo->query("SHOW COLUMNS FROM ai_chatbot_settings")->fetchAll(PDO::FETCH_COLUMN);
                if (!in_array('ai_version', $colsSet))
                    $pdo->exec("ALTER TABLE ai_chatbot_settings ADD COLUMN ai_version INT DEFAULT 1");
                if (!in_array('intent_configs', $colsSet))
                    $pdo->exec("ALTER TABLE ai_chatbot_settings ADD COLUMN intent_configs LONGTEXT DEFAULT NULL");

                $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
                if (!in_array('ai_term_stats', $tables)) {
                    $pdo->exec("CREATE TABLE ai_term_stats (
                        term VARCHAR(100),
                        property_id VARCHAR(50),
                        df INT DEFAULT 0,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        PRIMARY KEY (term, property_id),
                        INDEX (property_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                }

                // FIX: Ensure all folders are marked as 'trained' so they don't trigger training alerts
                $pdo->exec("UPDATE ai_training_docs SET status = 'trained' WHERE source_type = 'folder' AND status = 'pending'");

            } catch (Exception $e) {
                error_log("Self-healing error: " . $e->getMessage());
            }

            // RE-FETCH Settings after potential schema fix
            $cacheDir = __DIR__ . "/cache";
            $cacheFile = "$cacheDir/settings_{$propertyId}.json";
            if (file_exists($cacheFile))
                @unlink($cacheFile);

            $stmtKey = $pdo->prepare("SELECT gemini_api_key, chunk_size, chunk_overlap FROM ai_chatbot_settings WHERE property_id = ? LIMIT 1");
            $stmtKey->execute([$propertyId]);
            $propSettings = $stmtKey->fetch(PDO::FETCH_ASSOC) ?: [];
            $activeApiKey = (!empty($propSettings['gemini_api_key'])) ? $propSettings['gemini_api_key'] : $GEMINI_API_KEY;

            // 1. Fetch, Clear Old Chunks, and Prepare New Chunks
            $allChunksToProcess = [];
            $placeholders = str_repeat('?,', count($docIds) - 1) . '?';

            $stmtDocs = $pdo->prepare("SELECT id, name, content, tags, priority, source_type FROM ai_training_docs WHERE id IN ($placeholders)");
            $stmtDocs->execute($docIds);

            // Need to process docs one by one to chunk them properly
            $pdo->prepare("DELETE FROM ai_training_chunks WHERE doc_id IN ($placeholders)")->execute($docIds);

            $skippedDocIds = [];
            while ($row = $stmtDocs->fetch(PDO::FETCH_ASSOC)) {
                if (empty(trim($row['content'])) || $row['source_type'] === 'folder') {
                    $skippedDocIds[] = $row['id'];
                    continue;
                }

                // Chunk the content using DB settings
                $cSize = !empty($propSettings['chunk_size']) ? (int) $propSettings['chunk_size'] : 1000;
                $cOverlap = !empty($propSettings['chunk_overlap']) ? (int) $propSettings['chunk_overlap'] : 300;
                $textSegments = chunkText($row['content'], $cSize, $cOverlap);

                $docTitle = $row['name'] ?? 'Tài liệu';
                $docTags = json_decode($row['tags'] ?? '[]', true);
                if (!is_array($docTags))
                    $docTags = [];

                foreach ($textSegments as $segment) {
                    // RICH TEXT FOR EMBEDDING (Point #1)
                    $richText = "[TITLE: $docTitle]\n[CONTENT]\n$segment";
                    if (!empty($docTags)) {
                        $richText .= "\nFACTS:\n- " . implode("\n- ", $docTags);
                    }

                    $allChunksToProcess[] = [
                        'doc_id' => $row['id'],
                        'content' => $segment,
                        'metadata_text' => $richText, // Rich structured text
                        'tags' => $row['tags'],
                        'priority' => $row['priority']
                    ];
                }
            }

            // Immediately mark empty/folder docs as 'trained' to stop them showing as 'pending'
            if (!empty($skippedDocIds)) {
                $sPlaceholders = str_repeat('?,', count($skippedDocIds) - 1) . '?';
                $pdo->prepare("UPDATE ai_training_docs SET status = 'trained', updated_at = NOW() WHERE id IN ($sPlaceholders)")
                    ->execute(array_values($skippedDocIds));
                training_log("Marked " . count($skippedDocIds) . " empty or folder docs as trained.");
            }

            // 2. Process in batches
            $successCount = 0;
            $processedDocIds = $skippedDocIds; // Start with skipped ones
            $BATCH_SIZE = 20; // Gemini limit per batch request
            $chunkBatches = array_chunk($allChunksToProcess, $BATCH_SIZE);

            foreach ($chunkBatches as $batch) {
                // Prepare texts for API (Using RICH metadata text for better semantic match)
                $texts = array_column($batch, 'metadata_text');
                $batchDocIds = array_unique(array_column($batch, 'doc_id'));

                // Call Batch API
                $embeddings = callGeminiBatchEmbedding($texts, $activeApiKey);

                // Handle API-level error
                if (isset($embeddings['error'])) {
                    if (!empty($batchDocIds)) {
                        $ePlaceholders = str_repeat('?,', count($batchDocIds) - 1) . '?';
                        $pdo->prepare("UPDATE ai_training_docs SET status = 'error' WHERE id IN ($ePlaceholders)")->execute(array_values($batchDocIds));
                        foreach ($batchDocIds as $bid)
                            $processedDocIds[] = $bid;
                    }
                    training_log("Batch API Error: " . $embeddings['error'] . ". Marked " . count($batchDocIds) . " docs as error.");
                    continue;
                }

                // Process results - Use Transaction + Prepared Statement Reuse
                $pdo->beginTransaction();
                try {
                    $stmtInsert = $pdo->prepare("INSERT INTO ai_training_chunks (id, doc_id, property_id, content, metadata_text, embedding, embedding_binary, vector_norm, tags, priority_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

                    foreach ($batch as $index => $chunkItem) {
                        $vector = $embeddings[$index]['values'] ?? null;
                        if (!$vector)
                            continue;

                        $chunkId = bin2hex(random_bytes(18));
                        $norm = 0;
                        foreach ($vector as $v)
                            $norm += $v * $v;
                        $norm = sqrt($norm);

                        $packed = pack('f*', ...$vector);

                        // FIX TAGS: Ensure tags is a valid JSON string
                        $tagsVal = $chunkItem['tags'];
                        if (is_array($tagsVal)) {
                            $tagsVal = json_encode($tagsVal);
                        } else if (empty($tagsVal) || $tagsVal === 'null') {
                            $tagsVal = '[]';
                        }
                        // If it's already a JSON string from DB, it's fine.

                        $stmtInsert->execute([
                            $chunkId,
                            $chunkItem['doc_id'],
                            $propertyId,
                            $chunkItem['content'],
                            $chunkItem['metadata_text'],
                            json_encode($vector),
                            $packed,
                            $norm,
                            $tagsVal,
                            $chunkItem['priority'] ?: 0
                        ]);

                        $successCount++;
                    }

                    // Update timestamps for these docs (Batched update)
                    if (!empty($batchDocIds)) {
                        $pPlaceholders = str_repeat('?,', count($batchDocIds) - 1) . '?';
                        $pdo->prepare("UPDATE ai_training_docs SET status = 'trained', updated_at = NOW() WHERE id IN ($pPlaceholders)")->execute(array_values($batchDocIds));
                        foreach ($batchDocIds as $bid)
                            $processedDocIds[] = $bid;
                    }

                    $pdo->commit();
                } catch (Exception $e) {
                    $pdo->rollBack();
                    training_log("Transaction error in batch: " . $e->getMessage());
                }
            }

            // FINAL CLEANUP: Any doc that was in our list but didn't get processed (e.g. errored or no chunks)
            // should be marked as trained to avoid being stuck in 'pending' if it was skipped for some reason.
            $processedDocIds = array_unique($processedDocIds);
            $remainingIds = array_diff($docIds, $processedDocIds);
            if (!empty($remainingIds)) {
                $remPlaceholders = str_repeat('?,', count($remainingIds) - 1) . '?';
                $pdo->prepare("UPDATE ai_training_docs SET status = 'trained', updated_at = NOW() WHERE id IN ($remPlaceholders) AND status = 'pending'")
                    ->execute(array_values($remainingIds));
                training_log("Final cleanup: Marked " . count($remainingIds) . " remaining docs as trained.");
            }

            // 3. Post-Process (Point #2 & #4)
            updatePropertyTermStats($pdo, $propertyId);
            $pdo->prepare("UPDATE ai_chatbot_settings SET ai_version = ai_version + 1 WHERE property_id = ?")->execute([$propertyId]);

            echo json_encode(['success' => true, 'trained_count' => count($docIds), 'chunks_created' => $successCount]);

        } elseif ($action === 'create_cache') {
            // NEW: Create Context Cache for ALL active docs

            // 1. Get Settings & API Key
            $stmtKey = $pdo->prepare("SELECT gemini_api_key, model_id FROM ai_chatbot_settings WHERE property_id = ? LIMIT 1");
            $stmtKey->execute([$propertyId]);
            $settings = $stmtKey->fetch(PDO::FETCH_ASSOC);
            $activeApiKey = (!empty($settings['gemini_api_key'])) ? $settings['gemini_api_key'] : $GEMINI_API_KEY;
            // Ensure we use a model that supports caching (e.g. flash-1.5, pro-1.5). Default to user choice or flash.
            // Model name must have 'models/' prefix for caching API? Usually yes.
            // If user stored 'gemini-1.5-flash', we need 'models/gemini-1.5-flash-001' typically.
            // For safety, let's hardcode to a known cache-compatible model or use the setting with prefix.
            $modelName = $settings['model_id'] ?? 'gemini-1.5-flash';
            if (strpos($modelName, 'models/') === false) {
                $modelName = 'models/' . $modelName; // rough fix, might need specific version mapping
            }
            // Caching usually requires explicit version e.g. gemini-1.5-flash-001. 
            // Let's assume the user selects a valid one or we force 'models/gemini-1.5-flash-001' for now if generic.
            if ($modelName == 'models/gemini-1.5-flash')
                $modelName = 'models/gemini-1.5-flash-001';


            // 2. Fetch ALL Active Content
            $stmtDocs = $pdo->prepare("SELECT content, name FROM ai_training_docs WHERE property_id = ? AND is_active = 1 ORDER BY priority DESC");
            $stmtDocs->execute([$propertyId]);
            $allDocs = $stmtDocs->fetchAll(PDO::FETCH_ASSOC);

            if (empty($allDocs)) {
                echo json_encode(['success' => false, 'message' => 'No active documents to cache']);
                exit;
            }

            // 3. Prepare Parts
            $parts = [];
            foreach ($allDocs as $d) {
                $parts[] = ["text" => "FILE: " . $d['name'] . "\nCONTENT:\n" . $d['content'] . "\n---"];
            }

            // 4. Create Cache (TTL 1 hour = 3600s initially)
            // Note: Minimum token count rules apply (~1000 tokens).
            $res = callGeminiCreateCache($modelName, $parts, 3600, $activeApiKey);

            if (isset($res['error'])) {
                echo json_encode(['success' => false, 'message' => $res['error']]);
            } else {
                // Success
                $cacheName = $res['name']; // e.g. "cachedContents/xyz"
                $expireTime = $res['expireTime']; // ISO string

                // Update DB
                $pdo->prepare("UPDATE ai_chatbot_settings SET gemini_cache_name = ?, gemini_cache_expires_at = ? WHERE property_id = ?")
                    ->execute([$cacheName, date('Y-m-d H:i:s', strtotime($expireTime)), $propertyId]);

                echo json_encode(['success' => true, 'cache_name' => $cacheName]);
            }
        }
        // --- NEW ACTION: UPDATE PRIORITY ---
        elseif ($action === 'update_priority') {
            $items = $input['items'] ?? []; // [{id: '...', priority: 10}]

            foreach ($items as $item) {
                if (isset($item['id']) && isset($item['priority'])) {
                    // Update Doc
                    $pdo->prepare("UPDATE ai_training_docs SET priority = ? WHERE id = ? AND property_id = ?")
                        ->execute([$item['priority'], $item['id'], $propertyId]);

                    // Update Chunks (so RAG can search by priority)
                    $pdo->prepare("UPDATE ai_training_chunks SET priority_level = ? WHERE doc_id = ? AND property_id = ?")
                        ->execute([$item['priority'], $item['id'], $propertyId]);

                    // Note: If this is a batch/folder, currently we structure by batch_id. 
                    if (isset($item['is_batch']) && $item['is_batch']) {
                        // Find all docs in batch
                        $batchId = $item['batch_id'] ?? $item['id']; // ID might be batchID in UI
                        $pdo->prepare("UPDATE ai_training_docs SET priority = ? WHERE property_id = ? AND JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.batch_id')) = ?")
                            ->execute([$item['priority'], $propertyId, $batchId]);

                        $pdo->prepare("UPDATE ai_training_chunks c
                                        JOIN ai_training_docs d ON c.doc_id = d.id
                                        SET c.priority_level = ?
                                        WHERE d.property_id = ? AND JSON_UNQUOTE(JSON_EXTRACT(d.metadata, '$.batch_id')) = ?")
                            ->execute([$item['priority'], $propertyId, $batchId]);
                    }
                }
            }
            echo json_encode(['success' => true]);
        } elseif ($action === 'update_tags') {
            $docId = $input['doc_id'] ?? '';
            $tags = $input['tags'] ?? ''; // Comma separated

            if (!$docId) {
                echo json_encode(['success' => false, 'error' => 'Missing doc_id']);
                exit;
            }

            try {
                // Ensure column exists (Lazy Migration)
                $stmtCheck = $pdo->query("SHOW COLUMNS FROM ai_training_docs LIKE 'tags'");
                if ($stmtCheck->rowCount() == 0) {
                    $pdo->exec("ALTER TABLE ai_training_docs ADD COLUMN tags TEXT DEFAULT NULL");
                }
            } catch (Exception $e) {
            }

            // 1. Update Parent Doc (Persistence)
            $pdo->prepare("UPDATE ai_training_docs SET tags = ? WHERE id = ?")->execute([$tags, $docId]);

            // 2. Update Chunks (Runtime)
            $pdo->prepare("UPDATE ai_training_chunks SET tags = ? WHERE doc_id = ?")->execute([$tags, $docId]);

            echo json_encode(['success' => true]);
            exit;
        } elseif ($action === 'create_folder') {
            $folderName = $input['name'] ?? 'New Folder';
            $batchId = 'folder_' . bin2hex(random_bytes(8));

            // Create a placeholder doc to represent the folder
            $docId = bin2hex(random_bytes(18));
            $meta = ['batch_id' => $batchId, 'is_folder_root' => true];

            $pdo->prepare("INSERT INTO ai_training_docs (id, property_id, name, source_type, is_active, status, priority, content, metadata, parent_id) 
                            VALUES (?, ?, ?, 'folder', 1, 'trained', 0, '', ?, 0)")
                ->execute([$docId, $propertyId, $folderName, json_encode($meta)]);

            echo json_encode(['success' => true, 'batch_id' => $batchId, 'folder_id' => $docId]);
        } elseif ($action === 'add_manual') {
            $name = $input['name'] ?? 'Manual';
            $content = $input['content'] ?? '';
            $tags = $input['tags'] ?? [];
            $priority = $input['priority'] ?? 0;
            $batchId = $input['batch_id'] ?? null;

            $docId = bin2hex(random_bytes(18));
            $meta = ['priority' => $priority];
            if ($batchId)
                $meta['batch_id'] = $batchId;

            $parentId = $input['batch_id'] ?? '0';

            $pdo->prepare("INSERT INTO ai_training_docs (id, property_id, name, source_type, is_active, status, priority, content, tags, metadata, parent_id) VALUES (?, ?, ?, 'manual', 1, 'pending', ?, ?, ?, ?, ?)")
                ->execute([$docId, $propertyId, $name, $priority, $content, json_encode($tags), json_encode($meta), $parentId]);

            // autoTrainDoc removed - wait for manual trigger

            echo json_encode(['success' => true, 'doc_id' => $docId]);

        } elseif ($action === 'update_settings') {
            // Lazy Schema Migration (Self-healing)
            try {
                $check = $pdo->query("SHOW COLUMNS FROM ai_chatbot_settings LIKE 'auto_open'")->fetch();
                if (!$check) {
                    $pdo->exec("ALTER TABLE ai_chatbot_settings ADD COLUMN IF NOT EXISTS widget_position VARCHAR(20) DEFAULT 'bottom-right' AFTER history_limit");
                    $pdo->exec("ALTER TABLE ai_chatbot_settings ADD COLUMN IF NOT EXISTS excluded_pages JSON DEFAULT NULL AFTER widget_position");
                    $pdo->exec("ALTER TABLE ai_chatbot_settings ADD COLUMN IF NOT EXISTS excluded_paths JSON DEFAULT NULL AFTER excluded_pages");
                    $pdo->exec("ALTER TABLE ai_chatbot_settings ADD COLUMN IF NOT EXISTS auto_open TINYINT(1) DEFAULT 0 AFTER excluded_paths");
                }
            } catch (Exception $e) { /* skip */
            }

            $status = $input['is_enabled'] ?? 0;
            $name = $input['bot_name'] ?? 'AI Consultant';
            $company = $input['company_name'] ?? '';
            $color = $input['brand_color'] ?? '#111729';
            $avatar = $input['bot_avatar'] ?? '';
            $welcome = $input['welcome_msg'] ?? '';
            $persona = $input['persona_prompt'] ?? '';
            $gemini_key = $input['gemini_api_key'] ?? '';
            $quick_actions = $input['quick_actions'] ?? [];

            $chunk_size = isset($input['chunk_size']) ? (int) $input['chunk_size'] : 1000;
            $chunk_overlap = isset($input['chunk_overlap']) ? (int) $input['chunk_overlap'] : 300;

            $system_instruction = $input['system_instruction'] ?? null;

            $fast_replies = isset($input['fast_replies']) ? json_encode($input['fast_replies']) : null;

            $similarity_threshold = isset($input['similarity_threshold']) ? (float) $input['similarity_threshold'] : 0.55;
            $top_k = isset($input['top_k']) ? (int) $input['top_k'] : 12;
            $history_limit = isset($input['history_limit']) ? (int) $input['history_limit'] : 5;

            $widget_position = isset($input['widget_position']) ? (string) $input['widget_position'] : 'bottom-right';
            $excluded_pages = isset($input['excluded_pages']) ? json_encode($input['excluded_pages']) : '[]';
            $excluded_paths = isset($input['excluded_paths']) ? json_encode($input['excluded_paths']) : '[]';

            // Validate overlap max 50%
            if ($chunk_overlap > $chunk_size * 0.5) {
                echo json_encode(['success' => false, 'message' => 'Độ trễ gối đầu (Overlap) không được vượt quá 50% kích thước đoạn.']);
                exit;
            }

            $autoOpen = isset($input['auto_open']) ? (int) $input['auto_open'] : 0;

            $stmt = $pdo->prepare("INSERT INTO ai_chatbot_settings (property_id, is_enabled, bot_name, company_name, brand_color, bot_avatar, welcome_msg, persona_prompt, gemini_api_key, quick_actions, chunk_size, chunk_overlap, system_instruction, fast_replies, similarity_threshold, top_k, history_limit, widget_position, excluded_pages, excluded_paths, auto_open) 
                                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                                   ON DUPLICATE KEY UPDATE 
                                        is_enabled = VALUES(is_enabled), 
                                        bot_name = VALUES(bot_name), 
                                        company_name = VALUES(company_name),
                                        brand_color = VALUES(brand_color),
                                        bot_avatar = VALUES(bot_avatar),
                                        welcome_msg = VALUES(welcome_msg), 
                                        persona_prompt = VALUES(persona_prompt),
                                        gemini_api_key = VALUES(gemini_api_key),
                                        quick_actions = VALUES(quick_actions),
                                        chunk_size = VALUES(chunk_size),
                                        chunk_overlap = VALUES(chunk_overlap),
                                        system_instruction = VALUES(system_instruction),

                                        fast_replies = VALUES(fast_replies),
                                        similarity_threshold = VALUES(similarity_threshold),
                                        top_k = VALUES(top_k),
                                        history_limit = VALUES(history_limit),
                                        widget_position = VALUES(widget_position),
                                        excluded_pages = VALUES(excluded_pages),
                                        excluded_paths = VALUES(excluded_paths),
                                        auto_open = VALUES(auto_open)");
            $stmt->execute([
                $propertyId,
                $status,
                $name,
                $company,
                $color,
                $avatar,
                $welcome,
                $persona,
                $gemini_key,
                json_encode($quick_actions),
                $chunk_size,
                $chunk_overlap,
                $system_instruction,

                $fast_replies,
                $similarity_threshold,
                $top_k,
                $history_limit,
                $widget_position,
                $excluded_pages,
                $excluded_paths,
                $autoOpen
            ]);

            // Invalidate Cache for ai_chatbot.php
            $cacheFile = __DIR__ . "/cache/settings_{$propertyId}.json";
            if (file_exists($cacheFile))
                unlink($cacheFile);

            echo json_encode(['success' => true]);
        } elseif ($action === 'toggle_batch') {
            $batchId = $input['batch_id'] ?? null;
            $isActive = $input['is_active'] ?? 0;
            if ($batchId) {
                $pdo->prepare("UPDATE ai_training_docs SET is_active = ? WHERE property_id = ? AND JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.batch_id')) = ?")
                    ->execute([$isActive, $propertyId, $batchId]);
                echo json_encode(['success' => true]);
            }
        } elseif ($action === 'upload_file') {
            // ... Similar to manual, set status pending
            if (!isset($_FILES['file'])) {
                echo json_encode(['success' => false]);
                exit;
            }

            $file = $_FILES['file'];
            $propId = $_POST['property_id'];
            $batchId = $_POST['batch_id'] ?? null;
            $priority = $_POST['priority'] ?? 0;

            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $uploadDir = '../uploads/ai_training/';
            if (!is_dir($uploadDir))
                mkdir($uploadDir, 0777, true);

            $fileName = bin2hex(random_bytes(8)) . '_' . $file['name'];
            $targetPath = $uploadDir . $fileName;
            move_uploaded_file($file['tmp_name'], $targetPath);
            $fileUrl = "https://" . $_SERVER['HTTP_HOST'] . "/uploads/ai_training/" . $fileName; // simplified

            // Extract text if txt
            $content = "File: " . $file['name'] . "\nLink: " . $fileUrl;
            if ($ext === 'txt')
                $content .= "\n\n" . file_get_contents($targetPath);

            $docId = bin2hex(random_bytes(18));
            $meta = ['original_name' => $file['name'], 'file_url' => $fileUrl, 'batch_id' => $batchId, 'priority' => $priority];
            $parentId = $batchId ?? '0';

            $pdo->prepare("INSERT INTO ai_training_docs (id, property_id, name, source_type, is_active, status, priority, content, tags, metadata, parent_id) VALUES (?, ?, ?, 'upload', 1, 'pending', ?, ?, ?, ?, ?)")
                ->execute([$docId, $propId, $file['name'], $priority, $content, json_encode(['file']), json_encode($meta), $parentId]);

            // autoTrainDoc removed - wait for manual trigger

            echo json_encode(['success' => true]);
        } elseif ($action === 'update_doc') {
            $id = $input['id'] ?? ($_POST['id'] ?? null);
            if (!$id) {
                echo json_encode(['success' => false, 'message' => 'Missing ID']);
                exit;
            }

            // Check what fields are being updated
            $fields = [];
            $params = [];
            // Fetch current doc to check for changes
            $stmtCurrent = $pdo->prepare("SELECT content FROM ai_training_docs WHERE id = ?");
            $stmtCurrent->execute([$id]);
            $currentDoc = $stmtCurrent->fetch(PDO::FETCH_ASSOC);

            if (isset($input['name'])) {
                $fields[] = "name = ?";
                $params[] = $input['name'];
            }
            if (isset($input['content'])) {
                $newContent = $input['content'];
                $fields[] = "content = ?";
                $params[] = $newContent;

                // Only mark as pending if content has MEANINGFULLY CHANGED (ignore whitespace diffs)
                $oldTrimmed = $currentDoc ? trim($currentDoc['content']) : '';
                $newTrimmed = trim($newContent);

                if ($oldTrimmed !== $newTrimmed) {
                    // Only mark as pending if it's NOT a folder
                    $stmtST = $pdo->prepare("SELECT source_type FROM ai_training_docs WHERE id = ?");
                    $stmtST->execute([$id]);
                    $st = $stmtST->fetchColumn();
                    if ($st !== 'folder') {
                        $fields[] = "status = 'pending'";
                    }
                }
            }
            if (isset($input['tags'])) {
                $fields[] = "tags = ?";
                $params[] = json_encode($input['tags']);
            }
            if (isset($input['is_active'])) {
                $fields[] = "is_active = ?";
                $params[] = $input['is_active'];
            }

            if (empty($fields)) {
                echo json_encode(['success' => true, 'message' => 'No changes']);
                exit;
            }

            $params[] = $id;
            $params[] = $propertyId;

            $sql = "UPDATE ai_training_docs SET " . implode(', ', $fields) . ", updated_at = NOW() WHERE id = ? AND property_id = ?";
            $pdo->prepare($sql)->execute($params);

            // Auto-training removed. Only manual training allowed.
            // if ($needsTraining) {
            //     autoTrainDoc($pdo, $id, $propertyId);
            // }

            echo json_encode(['success' => true]);

        } elseif ($action === 'delete_batch') {
            $batchId = $input['batch_id'] ?? null;
            if (!$batchId) {
                echo json_encode(['success' => false, 'message' => 'Missing Batch ID']);
                exit;
            }

            // Clean suggestions for batch
            // Logic: The input batch_id might be the Folder Doc ID (frontend legacy) or the actual metadata.batch_id
            $targetBatchId = $batchId;

            // Try to resolve real batch_id if input is a Doc ID
            $stmtResolve = $pdo->prepare("SELECT metadata FROM ai_training_docs WHERE property_id = ? AND id = ? AND source_type = 'folder'");
            $stmtResolve->execute([$propertyId, $batchId]);
            $folderDoc = $stmtResolve->fetch(PDO::FETCH_ASSOC);
            if ($folderDoc) {
                $fMeta = json_decode($folderDoc['metadata'], true);
                if (isset($fMeta['batch_id'])) {
                    $targetBatchId = $fMeta['batch_id'];
                }
            }

            // Now delete using targetBatchId
            $stmtBatch = $pdo->prepare("SELECT metadata FROM ai_training_docs WHERE property_id = ? AND (JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.batch_id')) = ? OR metadata LIKE ?)");
            $stmtBatch->execute([$propertyId, $targetBatchId, '%"batch_id":"' . $targetBatchId . '"%']);
            while ($d = $stmtBatch->fetch(PDO::FETCH_ASSOC)) {
                $m = json_decode($d['metadata'], true);
                if (isset($m['url'])) {
                    $pdo->prepare("DELETE FROM ai_suggested_links WHERE property_id = ? AND source_url = ?")->execute([$propertyId, $m['url']]);
                }
            }

            // Delete chunks first
            $pdo->prepare("DELETE chunks FROM ai_training_chunks chunks 
                           JOIN ai_training_docs docs ON chunks.doc_id = docs.id 
                           WHERE docs.property_id = ? AND (JSON_UNQUOTE(JSON_EXTRACT(docs.metadata, '$.batch_id')) = ? OR docs.metadata LIKE ?)")
                ->execute([$propertyId, $targetBatchId, '%"batch_id":"' . $targetBatchId . '"%']);

            // Delete docs
            $pdo->prepare("DELETE FROM ai_training_docs 
                           WHERE property_id = ? AND (JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.batch_id')) = ? OR metadata LIKE ?)")
                ->execute([$propertyId, $targetBatchId, '%"batch_id":"' . $targetBatchId . '"%']);

            // Also ensure the folder doc itself is deleted if we used the internal batch ID (it might have been missed if logic relied solely on metadata matching, though usually folder doc has metadata.batch_id too)
            // But if we delete based on metadata.batch_id, the folder doc (which HAS that metadata) should already be gone.
            // Just in case the original ID was passed and somehow didn't have the metadata set correctly (rare), we can try deleting by ID too.
            $pdo->prepare("DELETE FROM ai_training_docs WHERE id = ? AND property_id = ? AND source_type = 'folder'")->execute([$batchId, $propertyId]);

            echo json_encode(['success' => true]);
        } elseif ($action === 'update_priority') {
            $items = $input['items'] ?? [];
            if (empty($items)) {
                echo json_encode(['success' => false, 'message' => 'No items provided']);
                exit;
            }

            $pdo->beginTransaction();
            try {
                $stmtDoc = $pdo->prepare("UPDATE ai_training_docs SET priority = ? WHERE id = ? AND property_id = ?");
                $stmtBatch = $pdo->prepare("UPDATE ai_training_docs SET priority = ? WHERE property_id = ? AND parent_id = ?");

                foreach ($items as $item) {
                    $id = $item['id'];
                    $priority = (int) $item['priority'];

                    // Update the doc/folder itself
                    $stmtDoc->execute([$priority, $id, $propertyId]);

                    // If it's a batch (folder), update all its children too so they inherit the aesthetic order
                    if (!empty($item['is_batch']) && !empty($item['batch_id'])) {
                        // The frontend sends batch_id (the string identifier)
                        // In internal logic, parent_id is the doc_id of the folder.
                        // Let's update both by id and by parent_id just to be safe.
                        $stmtBatch->execute([$priority, $propertyId, $id]);
                    }
                }
                $pdo->commit();

                // Clear Cache to reflect new order
                $cacheFile = __DIR__ . "/cache/settings_{$propertyId}.json";
                if (file_exists($cacheFile))
                    @unlink($cacheFile);

                echo json_encode(['success' => true]);
            } catch (Exception $e) {
                $pdo->rollBack();
                echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            }
            exit;
        }
    } elseif ($method === 'DELETE') {
        $propertyId = $_GET['property_id'] ?? null;
        if ($action === 'delete_doc') {
            $docId = $_GET['id'] ?? null;

            $stmtMeta = $pdo->prepare("SELECT metadata, source_type, parent_id FROM ai_training_docs WHERE id = ?");
            $stmtMeta->execute([$docId]);
            $docRow = $stmtMeta->fetch(PDO::FETCH_ASSOC);
            if ($docRow) {
                // If folder, delete children
                if ($docRow['source_type'] === 'folder') {
                    // Delete children docs
                    $stmtChildren = $pdo->prepare("SELECT id FROM ai_training_docs WHERE parent_id = ?");
                    $stmtChildren->execute([$docId]);
                    $childrenIds = $stmtChildren->fetchAll(PDO::FETCH_COLUMN);

                    foreach ($childrenIds as $cId) {
                        $pdo->prepare("DELETE FROM ai_training_chunks WHERE doc_id = ?")->execute([$cId]);
                        $pdo->prepare("DELETE FROM ai_training_docs WHERE id = ?")->execute([$cId]);
                    }
                }
            }

            $pdo->prepare("DELETE FROM ai_training_chunks WHERE doc_id = ?")->execute([$docId]);
            $pdo->prepare("DELETE FROM ai_training_docs WHERE id = ?")->execute([$docId]);
            echo json_encode(['success' => true]);
        } elseif ($action === 'delete_batch') {
            $batchId = $input['batch_id'] ?? null;



            // Delete chunks first
            $pdo->prepare("DELETE chunks FROM ai_training_chunks chunks 
                           JOIN ai_training_docs docs ON chunks.doc_id = docs.id 
                           WHERE docs.property_id = ? AND JSON_UNQUOTE(JSON_EXTRACT(docs.metadata, '$.batch_id')) = ?")
                ->execute([$propertyId, $batchId]);

            // Delete docs
            $pdo->prepare("DELETE FROM ai_training_docs 
                           WHERE property_id = ? AND JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.batch_id')) = ?")
                ->execute([$propertyId, $batchId]);
            echo json_encode(['success' => true]);
        }
    }
} catch (Throwable $e) {
    if (ob_get_length())
        ob_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'TRAINING ERROR: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
}
