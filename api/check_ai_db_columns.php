<?php
// api/check_ai_db_columns.php
require_once 'db_connect.php';

function printTableColumns($pdo, $table)
{
    echo "<h3>Table: $table</h3>";
    try {
        $stmt = $pdo->prepare("DESCRIBE $table");
        $stmt->execute();
        $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo "<table border='1'><tr><th>Field</th><th>Type</th><th>Key</th><th>Extra</th></tr>";
        foreach ($cols as $col) {
            echo "<tr><td>{$col['Field']}</td><td>{$col['Type']}</td><td>{$col['Key']}</td><td>{$col['Extra']}</td></tr>";
        }
        echo "</table><hr>";

        // Show Indexes
        $stmt = $pdo->prepare("SHOW INDEX FROM $table");
        $stmt->execute();
        $indexes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo "<b>Indexes:</b><br>";
        foreach ($indexes as $idx) {
            echo "{$idx['Key_name']} ({$idx['Column_name']}) <br>";
        }
        echo "<hr>";

    } catch (Exception $e) {
        echo "Error: " . $e->getMessage() . "<hr>";
    }
}

echo "<h2>AI RAG & Cache Optimization Check</h2>";
printTableColumns($pdo, 'ai_training_chunks');
printTableColumns($pdo, 'ai_rag_search_cache');
printTableColumns($pdo, 'ai_vector_cache');
?>