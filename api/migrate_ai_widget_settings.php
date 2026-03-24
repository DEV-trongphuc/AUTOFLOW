<?php
require_once 'db_connect.php';

header('Content-Type: text/plain');

echo "Migrating AI Widget Settings Schema...\n";

try {
    $table = 'ai_chatbot_settings';

    // Check if table exists
    $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
    if ($stmt->rowCount() == 0) {
        die("Table $table does not exist. Please run setup first.\n");
    }

    $stmt = $pdo->query("DESCRIBE $table");
    $cols = $stmt->fetchAll(PDO::FETCH_COLUMN);

    // 1. Widget Position
    if (!in_array('widget_position', $cols)) {
        echo "Adding widget_position column...\n";
        $pdo->exec("ALTER TABLE $table ADD COLUMN widget_position VARCHAR(50) DEFAULT 'bottom-right'");
    } else {
        echo "widget_position already exists.\n";
    }

    // 2. Excluded Pages
    if (!in_array('excluded_pages', $cols)) {
        echo "Adding excluded_pages column...\n";
        $pdo->exec("ALTER TABLE $table ADD COLUMN excluded_pages JSON DEFAULT NULL");
    } else {
        echo "excluded_pages already exists.\n";
    }

    // 3. Excluded Paths
    if (!in_array('excluded_paths', $cols)) {
        echo "Adding excluded_paths column...\n";
        $pdo->exec("ALTER TABLE $table ADD COLUMN excluded_paths JSON DEFAULT NULL");
    } else {
        echo "excluded_paths already exists.\n";
    }

    // 4. Auto Open
    if (!in_array('auto_open', $cols)) {
        echo "Adding auto_open column...\n";
        $pdo->exec("ALTER TABLE $table ADD COLUMN auto_open TINYINT(1) DEFAULT 0");
    } else {
        echo "auto_open already exists.\n";
    }

    echo "Migration completed successfully.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    http_response_code(500);
}
