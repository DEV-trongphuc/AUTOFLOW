<?php
require_once 'db_connect.php';

$email = 'dom.marketing.vn@gmail.com';

try {
    $stmt = $pdo->prepare("
        SELECT sfs.*, s.email, f.name as flow_name
        FROM subscriber_flow_states sfs
        JOIN subscribers s ON sfs.subscriber_id = s.id
        JOIN flows f ON sfs.flow_id = f.id
        WHERE s.email = ?
        ORDER BY sfs.updated_at DESC
    ");
    $stmt->execute([$email]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
