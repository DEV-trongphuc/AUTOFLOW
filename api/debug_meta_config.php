<?php
require_once 'db_connect.php';
$stmt = $pdo->query("DESCRIBE meta_app_configs");
$cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "<h3>meta_app_configs structure</h3>";
echo "<table border=1>";
foreach ($cols as $col) {
    echo "<tr><td>{$col['Field']}</td><td>{$col['Type']}</td></tr>";
}
echo "</table>";

$stmt = $pdo->query("SELECT page_name, token_expires_at FROM meta_app_configs");
$data = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "<h3>Sample Data</h3>";
echo "<pre>";
print_r($data);
echo "</pre>";
?>