<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

echo "Checking script accessibility... OK<br>";

require_once 'db_connect.php';
echo "Database connection script loaded... OK<br>";

try {
    $stmt = $pdo->query("SELECT DATABASE()");
    $dbName = $stmt->fetchColumn();
    echo "Connected to database: " . $dbName . "<br>";

    $sql = "
        SELECT 
            table_name AS 'table',
            round(((data_length + index_length) / 1024 / 1024), 2) AS 'size_mb',
            table_rows AS 'rows'
        FROM information_schema.TABLES
        WHERE table_schema = '$dbName'
        AND table_name IN ('web_visitors', 'web_sessions', 'web_page_views', 'web_events', 'subscribers')
        ORDER BY (data_length + index_length) DESC;
    ";

    $stmt = $pdo->query($sql);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "<h3>Table Statistics:</h3>";
    echo "<table border='1' cellpadding='5' style='border-collapse:collapse;'>";
    echo "<tr><th>Table</th><th>Size (MB)</th><th>Rows</th></tr>";
    $totalMB = 0;
    foreach ($results as $row) {
        echo "<tr><td>{$row['table']}</td><td>{$row['size_mb']}</td><td>{$row['rows']}</td></tr>";
        $totalMB += $row['size_mb'];
    }
    echo "<tr><td><b>TOTAL</b></td><td><b>$totalMB</b></td><td>-</td></tr>";
    echo "</table>";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
