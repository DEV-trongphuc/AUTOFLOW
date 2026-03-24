<?php
require_once 'db_connect.php';
$tables = ['meta_automation_scenarios', 'flows', 'subscribers', 'subscriber_flow_states'];
$schema = [];
foreach ($tables as $t) {
    try {
        $stmt = $pdo->query("DESCRIBE $t");
        $schema[$t] = $stmt->fetchAll();
    } catch (Exception $e) {
        $schema[$t] = "Error: " . $e->getMessage();
    }
}
file_put_contents(__DIR__ . '/../SCHEMA_DUMP.md', "```json\n" . json_encode($schema, JSON_PRETTY_PRINT) . "\n```");
echo "Done";
