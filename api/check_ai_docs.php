<?php
error_reporting(E_ALL);
ini_set('display_errors', '1');
header('Content-Type: text/plain; charset=UTF-8');

$host = 'localhost';
$db = 'vhvxoigh_mail_auto';
$user = 'vhvxoigh_mail_auto';
$pass = 'Ideas@812';
$pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
]);

$pid = '7c9a7040-a163-40dc-8e29-a1706a160564'; // DEV.IDEAS.EDU.VN

echo "=== DEV.IDEAS.EDU.VN | property_id=$pid ===\n\n";

// --- Column info ai_training_docs ---
$cols = array_column($pdo->query("DESCRIBE ai_training_docs")->fetchAll(), 'Field');
echo "ai_training_docs columns: " . implode(', ', $cols) . "\n\n";

$titleCol = in_array('title', $cols) ? 'title' : (in_array('name', $cols) ? 'name' : $cols[1]);

// --- Docs ---
$stmt = $pdo->prepare("SELECT status, COUNT(*) cnt FROM ai_training_docs WHERE property_id=? GROUP BY status");
$stmt->execute([$pid]);
echo "--- DOCS ---\n";
$total = 0;
foreach ($stmt->fetchAll() as $r) {
    echo "  status={$r['status']}: {$r['cnt']}\n";
    $total += $r['cnt'];
}
echo "  TOTAL: $total\n";

// --- Embedding chunks ---
$stmt = $pdo->prepare("SELECT COUNT(*) FROM ai_training_chunks c JOIN ai_training_docs d ON c.doc_id COLLATE utf8mb4_unicode_ci = d.id COLLATE utf8mb4_unicode_ci WHERE d.property_id=?");
$stmt->execute([$pid]);
echo "\n--- EMBEDDING CHUNKS: " . $stmt->fetchColumn() . " ---\n";

// --- PDF chunk results ---
echo "\n--- PDF CHUNK RESULTS ---\n";
try {
    $stmt = $pdo->prepare("SELECT r.status, COUNT(*) cnt FROM ai_pdf_chunk_results r JOIN ai_training_docs d ON r.doc_id COLLATE utf8mb4_unicode_ci = d.id COLLATE utf8mb4_unicode_ci WHERE d.property_id=? GROUP BY r.status");
    $stmt->execute([$pid]);
    $rows = $stmt->fetchAll();
    if (empty($rows))
        echo "  (empty)\n";
    else
        foreach ($rows as $r)
            echo "  status={$r['status']}: {$r['cnt']}\n";
} catch (Exception $e) {
    echo "  " . $e->getMessage() . "\n";
}

// --- Top 20 docs detail ---
$stmt = $pdo->prepare("
    SELECT d.id, d.$titleCol as title, d.status, d.source_type, d.updated_at, d.metadata,
           (SELECT COUNT(*) FROM ai_training_chunks WHERE doc_id COLLATE utf8mb4_unicode_ci = d.id COLLATE utf8mb4_unicode_ci) emb_chunks
    FROM ai_training_docs d WHERE d.property_id=?
    ORDER BY d.updated_at DESC LIMIT 20
");
$stmt->execute([$pid]);
echo "\n--- DOCS DETAIL ---\n";
foreach ($stmt->fetchAll() as $d) {
    $meta = json_decode($d['metadata'] ?? '{}', true);
    $pages = $meta['total_pages'] ?? '-';
    $totCh = $meta['total_chunks'] ?? '-';
    $chunked = !empty($meta['chunked_extraction']) ? ' [PDF_CHUNKED]' : '';
    $fileUrl = $meta['file_url'] ?? '';
    echo sprintf(
        "  ID: %s\n  Title: %s\n  Status: %s | Type: %s | Emb chunks: %s\n  Pages: %s | Total chunks: %s%s\n  File: %s\n  Updated: %s\n  ---\n",
        $d['id'],
        $d['title'] ?? '(no title)',
        $d['status'],
        $d['source_type'],
        $d['emb_chunks'],
        $pages,
        $totCh,
        $chunked,
        $fileUrl,
        $d['updated_at']
    );
}

// --- Queue jobs ---
$stmt = $pdo->prepare("SELECT queue, status, COUNT(*) cnt FROM queue_jobs WHERE payload LIKE ? AND queue IN ('ai_training','ai_pdf_chunk') GROUP BY queue, status");
$stmt->execute(['%' . $pid . '%']);
echo "--- QUEUE JOBS ---\n";
$jobs = $stmt->fetchAll();
if (empty($jobs))
    echo "  (no pending jobs)\n";
else
    foreach ($jobs as $j)
        echo "  [{$j['queue']}] {$j['status']}: {$j['cnt']}\n";

echo "\nDONE\n";
