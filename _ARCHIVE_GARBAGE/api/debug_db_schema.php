<?php
require_once 'db_connect.php';
header('Content-Type: text/html; charset=utf-8');

echo '<style>body{font-family:sans-serif;padding:20px;} table{border-collapse:collapse;width:100%;margin-bottom:20px;} th,td{border:1px solid #ddd;padding:8px;} th{background-color:#f2f2f2;text-align:left;} h2{margin-top:30px;color:#333;}</style>';

try {
    // Get database name
    $stmt = $pdo->query("SELECT DATABASE()");
    $dbName = $stmt->fetchColumn();
    echo "<h1>Database: $dbName</h1>";

    // 1. OVERVIEW: Table Sizes
    $sql = "
        SELECT 
            table_name as `Table`, 
            round(((data_length + index_length) / 1024 / 1024), 2) as `Size_MB`, 
            table_rows as `Rows`,
            data_free as `Free_Space`
        FROM information_schema.TABLES 
        WHERE table_schema = ? 
        AND (table_name LIKE 'web_%' OR table_name IN ('subscribers', 'zalo_subscribers', 'segments', 'subscriber_activity'))
        ORDER BY (data_length + index_length) DESC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$dbName]);
    $tables = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "<h2>Storage Overview</h2>";
    echo "<table>";
    echo "<tr><th>Table</th><th>Size (MB)</th><th>Rows</th><th>Free Space (B)</th></tr>";

    $totalSize = 0;
    foreach ($tables as $table) {
        $totalSize += $table['Size_MB'];
        echo "<tr>";
        echo "<td><b>{$table['Table']}</b></td>";
        echo "<td>{$table['Size_MB']} MB</td>";
        echo "<td>" . number_format($table['Rows']) . "</td>";
        echo "<td>" . number_format($table['Free_Space']) . "</td>";
        echo "</tr>";
    }
    echo "<tr style='background:#e0f7fa'><td colspan='4'><b>Total Tracking Storage: " . number_format($totalSize, 2) . " MB</b></td></tr>";
    echo "</table>";

    // 2. DETAILED SCHEMA
    echo "<h2>Detailed Schema</h2>";

    // Helper to get detailed tables
    $tablesDetail = [];
    $stmtTablesDetail = $pdo->query("SHOW TABLES LIKE 'web_%'");
    $tablesDetail = $stmtTablesDetail->fetchAll(PDO::FETCH_COLUMN);
    $extras = ['subscribers', 'zalo_subscribers', 'segments', 'subscriber_activity'];
    foreach ($extras as $e) {
        if (!in_array($e, $tablesDetail))
            $tablesDetail[] = $e;
    }

    foreach ($tablesDetail as $table) {
        echo "<h3>Table: $table</h3>";
        echo "<table>";

        // Columns
        echo "<tr style='background:#e0e0e0'><th colspan='6'>Columns</th></tr>";
        echo "<tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th><th>Extra</th></tr>";
        try {
            $columns = $pdo->query("DESCRIBE $table")->fetchAll(PDO::FETCH_ASSOC);
            foreach ($columns as $col) {
                echo "<tr>";
                foreach ($col as $val)
                    echo "<td>" . htmlspecialchars($val) . "</td>";
                echo "</tr>";
            }
        } catch (Exception $e) {
            echo "<tr><td colspan='6'>Error fetching columns: " . htmlspecialchars($e->getMessage()) . "</td></tr>";
        }

        // Indexes
        echo "<tr style='background:#e0e0e0'><th colspan='6'>Indexes</th></tr>";
        echo "<tr><th>Key Name</th><th>Column</th><th>Non_Unique</th><th colspan='3'>Index Type</th></tr>";

        try {
            $indexes = $pdo->query("SHOW INDEX FROM $table")->fetchAll(PDO::FETCH_ASSOC);
            foreach ($indexes as $idx) {
                echo "<tr>";
                echo "<td>" . htmlspecialchars($idx['Key_name']) . "</td>";
                echo "<td>" . htmlspecialchars($idx['Column_name']) . "</td>";
                echo "<td>" . htmlspecialchars($idx['Non_unique']) . "</td>";
                echo "<td colspan='3'>" . htmlspecialchars($idx['Index_type']) . "</td>";
                echo "</tr>";
            }
        } catch (Exception $e) { /* Ignore tables without indexes or errors */
        }

        echo "</table>";
    }

} catch (Exception $e) {
    echo "General Error: " . htmlspecialchars($e->getMessage());
}
?>