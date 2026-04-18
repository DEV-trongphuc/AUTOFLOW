<?php
require_once 'db_connect.php';

header('Content-Type: application/json');

try {
    $tables = ['subscribers', 'web_events', 'web_page_views', 'web_sessions', 'web_visitors'];
    $logs = [];

    foreach ($tables as $table) {
        $logs[] = "Optimizing $table...";
        // Enable Compression for InnoDB
        $pdo->exec("ALTER TABLE $table ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;");

        // OPTIMIZE TABLE returns a result set, we must fetch it to clear the buffer
        $stmt = $pdo->query("OPTIMIZE TABLE $table;");
        $stmt->fetchAll();
        $stmt->closeCursor();

        $logs[] = "Compressed $table successfully.";
    }

    echo json_encode([
        'success' => true,
        'message' => 'Extreme compression enabled for tracking tables.',
        'details' => $logs
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
