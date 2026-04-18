<?php
// api/diag_ai.php
require_once 'db_connect.php';
header('Content-Type: text/plain; charset=utf-8');

echo "--- AI SYSTEM DIAGNOSTIC ---\n";

// 1. Check API Key
$propertyId = $_GET['property_id'] ?? '7ac8420d-b248-4ab5-a97d-0fd177e0ae64';
$apiKey = $pdo->query("SELECT gemini_api_key FROM ai_chatbot_settings WHERE property_id = '$propertyId' LIMIT 1")->fetchColumn();
if (empty($apiKey)) {
    $apiKey = getenv('GEMINI_API_KEY');
    echo "Using GLOBAL API Key: " . (empty($apiKey) ? "MISSING" : "FOUND (" . substr($apiKey, 0, 5) . "...)") . "\n";
} else {
    echo "Using PROPERTY API Key: FOUND (" . substr($apiKey, 0, 5) . "...)\n";
}

if (empty($apiKey)) {
    die("ERROR: No API Key available.\n");
}

// 2. Check Models
echo "\nChecking available models via Google API...\n";
$url = "https://generativelanguage.googleapis.com/v1beta/models?key=" . $apiKey;
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    echo "ERROR: Gemini API call failed with HTTP $httpCode\n";
    echo "Response: $response\n";
} else {
    $data = json_decode($response, true);
    $models = array_column($data['models'] ?? [], 'name');
    echo "SUCCESS: Found " . count($models) . " models.\n";
    echo "Models sample: " . implode(", ", array_slice($models, 0, 5)) . "...\n";

    $commonModels = ['models/gemini-2.5-flash-lite', 'models/gemini-embedding-001', 'models/gemini-2.0-flash'];
    foreach ($commonModels as $m) {
        echo (in_array($m, $models) ? "✅" : "❌") . " $m\n";
    }
}

// 3. Check Database Errors
echo "\nChecking ai_training_docs for recent errors...\n";
$stmt = $pdo->query("SELECT name, error_message, updated_at FROM ai_training_docs WHERE status = 'error' ORDER BY updated_at DESC LIMIT 5");
$errors = $stmt->fetchAll();
if (empty($errors)) {
    echo "No errors found in ai_training_docs.\n";
} else {
    foreach ($errors as $e) {
        echo "[{$e['updated_at']}] {$e['name']}: {$e['error_message']}\n";
    }
}

// 4. Check Queue
echo "\nChecking queue_jobs for failed ai_training jobs...\n";
$stmt = $pdo->query("SELECT payload, error_message, finished_at FROM queue_jobs WHERE queue = 'ai_training' AND status = 'failed' ORDER BY finished_at DESC LIMIT 5");
$failedJobs = $stmt->fetchAll();
if (empty($failedJobs)) {
    echo "No failed ai_training queue jobs found.\n";
} else {
    foreach ($failedJobs as $fj) {
        echo "[{$fj['finished_at']}] Error: {$fj['error_message']}\n";
    }
}
