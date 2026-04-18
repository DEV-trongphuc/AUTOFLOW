<?php
require_once 'db_connect.php';
header('Content-Type: text/plain');
$stmt = $pdo->query("SELECT * FROM meta_app_configs LIMIT 5");
$configs = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($configs as $config) {
    echo "--- Page: " . $config['page_name'] . " ---\n";
    print_r($config);
}
