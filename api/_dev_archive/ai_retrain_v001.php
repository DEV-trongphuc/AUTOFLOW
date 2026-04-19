<?php
/**
 * api/ai_retrain_v001.php
 * Script to force re-index all RAG documents using gemini-embedding-001.
 * Run this after switching embedding models.
 *
 * [SECURITY] Requires CLI execution OR a pre-configured secret token.
 * Set RETRAINING_SECRET env var, then call: ?secret=<value>
 */

require_once 'db_connect.php';

// [SECURITY] Maintenance script — CLI or secret token required
$cliSecret = getenv('RETRAINING_SECRET') ?: '';
$reqSecret = $_GET['secret'] ?? '';
if (PHP_SAPI !== 'cli' && (empty($cliSecret) || $reqSecret !== $cliSecret)) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden — CLI or secret required']);
    exit;
}

// --- CONFIGURATION ---
set_time_limit(0);
ini_set('memory_limit', '1024M');

header('Content-Type: text/plain; charset=utf-8');

function log_info($msg)
{
    echo "[" . date('H:i:s') . "] $msg\n";
    if (ob_get_level() > 0) ob_flush();
    flush();
}

/**
 * Helper: Gemini Batch Embedding
 */
function callGeminiBatchEmbedding_Local($texts, $apiKey)
{
    $model = "gemini-embedding-001";
    $url   = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:batchEmbedContents";

    $requests = [];
    foreach ($texts as $t) {
        $requests[] = [
            "model"   => "models/{$model}",
            "content" => ["parts" => [["text" => $t]]]
        ];
    }
    $payload = ["requests" => $requests];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
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
        return ['error' => $result['error']['message'] ?? 'Gemini API Error (HTTP ' . $httpCode . ')'];
    }
    return $result['embeddings'] ?? ['error' => 'No embeddings returned'];
}

/**
 * Helper: Text Chunking
 */
function chunkText_Local($text, $chunkSize = 1000, $overlap = 300)
{
    if (mb_strlen($text) <= $chunkSize) return [$text];
    $chunks = [];
    $length = mb_strlen($text);
    $start  = 0;
    while ($start < $length) {
        $sub      = mb_substr($text, $start, $chunkSize);
        $chunks[] = trim($sub);
        $start   += ($chunkSize - $overlap);
        if ($start <= 0) break;
    }
    return $chunks;
}

/**
 * Helper: Update Term Frequency Stats (for BM25 hybrid search)
 */
function updateTermStats_Local($pdo, $propertyId)
{
    $pdo->prepare("DELETE FROM ai_term_stats WHERE property_id = ?")->execute([$propertyId]);
    $stmt = $pdo->prepare("SELECT content FROM ai_training_chunks WHERE property_id = ?");
    $stmt->execute([$propertyId]);
    $termDf = [];
    while ($content = $stmt->fetch(PDO::FETCH_COLUMN)) {
        $words      = preg_split('/[^\p{L}\p{N}]+/u', mb_strtolower($content), -1, PREG_SPLIT_NO_EMPTY);
        $uniqueWords = array_unique($words);
        foreach ($uniqueWords as $w) {
            if (mb_strlen($w) >= 2) $termDf[$w] = ($termDf[$w] ?? 0) + 1;
        }
    }
    if (!empty($termDf)) {
        $stmtIns = $pdo->prepare("INSERT INTO ai_term_stats (term, property_id, df)
                                  VALUES (?, ?, ?)
                                  ON DUPLICATE KEY UPDATE df = df + VALUES(df)");
        foreach ($termDf as $term => $df) {
            $stmtIns->execute([mb_substr($term, 0, 100), $propertyId, $df]);
        }
    }
}

try {
    log_info("--- RAG GLOBAL RE-INDEXER (MODEL: gemini-embedding-001) ---");

    $GEMINI_API_KEY = getenv('GEMINI_API_KEY') ?: '';

    $stmtProps  = $pdo->query("SELECT DISTINCT property_id FROM ai_training_docs WHERE is_active = 1");
    $properties = $stmtProps->fetchAll(PDO::FETCH_COLUMN);

    if (empty($properties)) {
        die("No active properties found.\n");
    }

    log_info("Found " . count($properties) . " properties to process.");

    foreach ($properties as $propertyId) {
        log_info("========================================");
        log_info("Processing Property: $propertyId");

        $stmtSet = $pdo->prepare("SELECT gemini_api_key, chunk_size, chunk_overlap FROM ai_chatbot_settings WHERE property_id = ?");
        $stmtSet->execute([$propertyId]);
        $settings = $stmtSet->fetch(PDO::FETCH_ASSOC) ?: [];

        $activeApiKey = (!empty($settings['gemini_api_key'])) ? $settings['gemini_api_key'] : $GEMINI_API_KEY;
        if (empty($activeApiKey)) {
            log_info("SKIP: No API Key found for property $propertyId");
            continue;
        }

        $cSize   = $settings['chunk_size']    ?? 1000;
        $cOverlap = $settings['chunk_overlap'] ?? 300;

        $stmtDocs = $pdo->prepare("SELECT id, name, content, tags, priority FROM ai_training_docs WHERE property_id = ? AND is_active = 1 AND source_type != 'folder'");
        $stmtDocs->execute([$propertyId]);
        $docs = $stmtDocs->fetchAll(PDO::FETCH_ASSOC);

        if (empty($docs)) {
            log_info("No documents found for this property.");
            continue;
        }

        log_info("Found " . count($docs) . " documents. Clearing old chunks...");

        $docIds       = array_column($docs, 'id');
        $placeholders = str_repeat('?,', count($docIds) - 1) . '?';
        $pdo->prepare("DELETE FROM ai_training_chunks WHERE doc_id IN ($placeholders)")->execute($docIds);

        $allChunks = [];
        foreach ($docs as $doc) {
            $segments = chunkText_Local($doc['content'], $cSize, $cOverlap);
            $tagsArr  = json_decode($doc['tags'] ?? '[]', true) ?: [];

            foreach ($segments as $seg) {
                $metadata = "[TITLE: {$doc['name']}]\n[CONTENT]\n$seg";
                if (!empty($tagsArr)) {
                    $metadata .= "\n[TAGS]\n- " . implode("\n- ", $tagsArr);
                }
                $allChunks[] = [
                    'doc_id'        => $doc['id'],
                    'content'       => $seg,
                    'metadata_text' => $metadata,
                    'tags'          => $doc['tags'],
                    'priority'      => $doc['priority']
                ];
            }
        }

        log_info("Chunks prepared: " . count($allChunks) . ". Starting embedding...");

        $batchSize     = 20;
        $chunksBatches = array_chunk($allChunks, $batchSize);
        $totalSuccess  = 0;

        foreach ($chunksBatches as $batchIndex => $batch) {
            $texts      = array_column($batch, 'metadata_text');
            $embeddings = callGeminiBatchEmbedding_Local($texts, $activeApiKey);

            if (isset($embeddings['error'])) {
                log_info("   Batch " . ($batchIndex + 1) . " ERROR: " . $embeddings['error']);
                continue;
            }

            $pdo->beginTransaction();
            try {
                $stmtIns = $pdo->prepare("INSERT INTO ai_training_chunks
                    (id, doc_id, property_id, content, metadata_text, embedding, embedding_binary, vector_norm, tags, priority_level)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

                foreach ($batch as $i => $chunkItem) {
                    $vector = $embeddings[$i]['values'] ?? null;
                    if (!$vector) continue;

                    $chunkId = bin2hex(random_bytes(18));
                    $norm    = 0;
                    foreach ($vector as $v) $norm += $v * $v;
                    $norm    = sqrt($norm);
                    $packed  = pack('f*', ...$vector);

                    $stmtIns->execute([
                        $chunkId,
                        $chunkItem['doc_id'],
                        $propertyId,
                        $chunkItem['content'],
                        $chunkItem['metadata_text'],
                        json_encode($vector),
                        $packed,
                        $norm,
                        $chunkItem['tags'] ?: '[]',
                        $chunkItem['priority'] ?: 0
                    ]);
                    $totalSuccess++;
                }
                $pdo->commit();
            } catch (Exception $e) {
                $pdo->rollBack();
                log_info("   Batch " . ($batchIndex + 1) . " DB ERROR: " . $e->getMessage());
            }

            if (($batchIndex + 1) % 5 === 0) {
                log_info("   Processed " . ($batchIndex + 1) * $batchSize . " chunks...");
            }
        }

        log_info("Updating property term stats...");
        updateTermStats_Local($pdo, $propertyId);

        $pdo->prepare("UPDATE ai_training_docs SET status = 'trained', updated_at = NOW() WHERE property_id = ? AND is_active = 1")->execute([$propertyId]);
        $pdo->prepare("DELETE FROM ai_rag_search_cache WHERE property_id = ?")->execute([$propertyId]);

        log_info("Property $propertyId complete. Total chunks created: $totalSuccess");
    }

    log_info("========================================");
    log_info("ALL DONE! Your RAG system is now fully synchronized with gemini-embedding-001.");

} catch (Exception $e) {
    log_info("CRITICAL ERROR: " . $e->getMessage());
}
