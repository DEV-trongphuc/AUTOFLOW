<?php
require_once 'db_connect.php';

$stmt = $pdo->query("SELECT id, name, config FROM flows WHERE name LIKE '%EVENT 18/4%' OR config LIKE '%Webinar AI%' LIMIT 5");
$flows = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($flows as $f) {
    echo "ID: {$f['id']}\nName: {$f['name']}\nConfig: {$f['config']}\n\n";
}
