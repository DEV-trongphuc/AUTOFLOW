<?php
require_once 'db_connect.php';
header('Content-Type: text/html; charset=utf-8');
function callApi($url, $token)
{
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url . '?access_token=' . $token);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    curl_close($ch);
    return json_decode($res, true);
}
$stmt = $pdo->query("SELECT * FROM meta_app_configs WHERE status = 'active'");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "<html><body style='font-family:sans-serif;padding:20px;'><h1>Meta Token Check</h1>";
foreach ($rows as $row) {
    $p = callApi("https://graph.facebook.com/v18.0/me/permissions", $row['page_access_token']);
    echo "<h3>Page: " . htmlspecialchars($row['page_name']) . "</h3>";
    echo "<p>Updated At: " . $row['updated_at'] . "</p>";
    echo "<pre>" . print_r($p, true) . "</pre><hr>";
}
echo "</body></html>";
