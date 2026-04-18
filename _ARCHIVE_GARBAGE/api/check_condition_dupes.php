<?php
require_once 'db_connect.php';
$fid = 'ad16ed97-06b8-49a6-a8da-222c93191db0';
$stepId = '80966800-d4c1-4afd-9393-4290aceb9fc1'; // Rẽ nhánh logic

echo "<pre>--- CHECKING CONDITION STATS --- \n";

$stmt = $pdo->prepare("SELECT type, COUNT(*) as total, COUNT(DISTINCT subscriber_id) as unique_subs FROM subscriber_activity WHERE flow_id = ? AND reference_id = ? GROUP BY type");
$stmt->execute([$fid, $stepId]);
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

$stmt2 = $pdo->prepare("SELECT subscriber_id, COUNT(*) as c FROM subscriber_activity WHERE flow_id = ? AND reference_id = ? GROUP BY subscriber_id HAVING c > 1");
$stmt2->execute([$fid, $stepId]);
$dupes = $stmt2->fetchAll(PDO::FETCH_ASSOC);
echo "\nSubscribers with multiple logs for this step:\n";
print_r($dupes);

echo "</pre>";
