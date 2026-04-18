<?php
require_once 'db_connect.php';

echo "<h3>Meta Automation Scenarios</h3>";
$stmt = $pdo->query("SELECT * FROM meta_automation_scenarios WHERE status = 'active'");
$scenarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "<table border=1>";
echo "<tr><th>ID</th><th>Config ID</th><th>Type</th><th>Trigger</th><th>Chatbot ID</th></tr>";
foreach ($scenarios as $s) {
    echo "<tr>";
    echo "<td>{$s['id']}</td>";
    echo "<td>{$s['meta_config_id']}</td>";
    echo "<td>{$s['type']}</td>";
    echo "<td>{$s['trigger_text']}</td>";
    echo "<td>{$s['ai_chatbot_id']}</td>";
    echo "</tr>";
}
echo "</table>";

echo "<h3>Meta App Configs</h3>";
$stmt = $pdo->query("SELECT id, page_id, page_name, chatbot_id FROM meta_app_configs");
$configs = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "<table border=1>";
echo "<tr><th>ID</th><th>Page ID</th><th>Page Name</th><th>Chatbot ID</th></tr>";
foreach ($configs as $c) {
    echo "<tr>";
    echo "<td>{$c['id']}</td>";
    echo "<td>{$c['page_id']}</td>";
    echo "<td>{$c['page_name']}</td>";
    echo "<td>{$c['chatbot_id']}</td>";
    echo "</tr>";
}
echo "</table>";
