<?php
// api/fix_db_models.php
require_once 'db_connect.php';
header('Content-Type: text/plain; charset=utf-8');

echo "Updating model_id in ai_chatbot_settings...\n";

$replacements = [
    'gemini-2.5-flash-lite' => 'gemini-2.5-flash-lite',
    'gemini-2.5-flash-lite' => 'gemini-2.5-flash-lite',
    'gemini-2.1-flash' => 'gemini-2.5-flash-lite',
];

foreach ($replacements as $old => $new) {
    $stmt = $pdo->prepare("UPDATE ai_chatbot_settings SET model_id = ? WHERE model_id = ?");
    $stmt->execute([$new, $old]);
    echo "Updated $old -> $new: " . $stmt->rowCount() . " rows\n";
}

// Reset docs in error state so user can retry easily
$stmt = $pdo->query("UPDATE ai_training_docs SET status = 'pending' WHERE status = 'error'");
echo "Reset " . $stmt->rowCount() . " error documents to pending.\n";

echo "Done.\n";
