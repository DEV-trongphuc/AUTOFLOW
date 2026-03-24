<?php
require_once 'db_connect.php';

echo "<h2>Checking 'global_assets' Schema</h2>";

try {
    $stmt = $pdo->query("SHOW FULL COLUMNS FROM global_assets");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "<table border='1' cellpadding='5' style='border-collapse: collapse; width: 100%;'>";
    echo "<tr style='background: #f0f0f0;'><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th><th>Extra</th></tr>";

    $required_cols = [
        'id',
        'name',
        'unique_name',
        'url',
        'type',
        'extension',
        'size',
        'source',
        'chatbot_id',
        'property_id',
        'conversation_id',
        'session_id',
        'metadata',
        'is_deleted',
        'created_at',
        'updated_at'
    ];

    $existing_cols = [];

    foreach ($columns as $col) {
        $existing_cols[] = $col['Field'];
        echo "<tr>";
        echo "<td><b>{$col['Field']}</b></td>";
        echo "<td>{$col['Type']}</td>";
        echo "<td>{$col['Null']}</td>";
        echo "<td>{$col['Key']}</td>";
        echo "<td>{$col['Default']}</td>";
        echo "<td>{$col['Extra']}</td>";
        echo "</tr>";
    }
    echo "</table>";

    // Check missing
    $missing = array_diff($required_cols, $existing_cols);
    if (!empty($missing)) {
        echo "<h3 style='color: red;'>MISSING COLUMNS: " . implode(', ', $missing) . "</h3>";

        // Auto-fix suggestions
        echo "<h4>Suggested Fix Queries:</h4>";
        echo "<pre style='background: #eee; padding: 10px;'>";
        foreach ($missing as $m) {
            echo "ALTER TABLE global_assets ADD COLUMN $m ...;\n";
        }
        echo "</pre>";
    } else {
        echo "<h3 style='color: green;'>Schema OK! All required columns present.</h3>";
    }

    // Check Indices
    echo "<h3>Indices</h3>";
    $stmt = $pdo->query("SHOW INDEX FROM global_assets");
    $indices = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "<ul>";
    foreach ($indices as $idx) {
        echo "<li>{$idx['Key_name']} -> {$idx['Column_name']}</li>";
    }
    echo "</ul>";

} catch (Exception $e) {
    if (strpos($e->getMessage(), "doesn't exist") !== false) {
        echo "<h3 style='color: red;'>Table 'global_assets' does not exist!</h3>";
    } else {
        echo "<div style='color: red;'>Error: " . $e->getMessage() . "</div>";
    }
}
?>