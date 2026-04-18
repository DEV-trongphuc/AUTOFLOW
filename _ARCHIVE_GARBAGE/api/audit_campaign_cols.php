<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

echo "FULL CAMPAIGN COLUMN AUDIT\n";
echo "==========================\n\n";

try {
    $stmt = $pdo->query("DESCRIBE campaigns");
    $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($cols as $row) {
        echo " - {$row['Field']} ({$row['Type']})\n";
    }

    echo "\nSample Analytics Data for 6985cffc6c490:\n";
    $stmt = $pdo->prepare("SELECT * FROM campaigns WHERE id = '6985cffc6c490'");
    $stmt->execute();
    $camp = $stmt->fetch(PDO::FETCH_ASSOC);
    foreach ($camp as $k => $v) {
        if (strpos($k, 'stat_') === 0 || strpos($k, 'count_') === 0) {
            echo " $k: " . (is_null($v) ? 'NULL' : $v) . "\n";
        }
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
