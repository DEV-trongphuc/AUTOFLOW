<?php
require_once 'db_connect.php';
$stmt = $pdo->prepare("SELECT content, score FROM (
    SELECT content, MATCH(content) AGAINST('tiếng Anh yếu' IN NATURAL LANGUAGE MODE) as score 
    FROM ai_training_chunks 
    WHERE property_id = (SELECT property_id FROM ai_chatbot_settings WHERE bot_name LIKE '%IDEAS%' LIMIT 1)
) as sub WHERE score > 0 ORDER BY score DESC LIMIT 5");
$stmt->execute();
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "--- Search results for 'tiếng Anh yếu' ---\n";
print_r($results);
?>