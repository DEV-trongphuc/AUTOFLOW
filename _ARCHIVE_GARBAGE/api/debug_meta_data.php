<?php
require_once 'db_connect.php';

echo "<h2>Checking meta_app_configs Data</h2>";
$stmt = $pdo->query("SELECT id, page_name, page_id, status FROM meta_app_configs");
$data = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "<table border=1><tr><th>ID</th><th>Page Name</th><th>Page ID</th><th>Status</th></tr>";
foreach ($data as $row) {
    echo "<tr><td>{$row['id']}</td><td>{$row['page_name']}</td><td>{$row['page_id']}</td><td>{$row['status']}</td></tr>";
}
echo "</table>";

echo "<h2>Checking meta_subscribers Sample</h2>";
$stmt = $pdo->query("SELECT id, name, psid, page_id FROM meta_subscribers LIMIT 5");
$subs = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "<pre>";
print_r($subs);
echo "</pre>";
?>