<?php
$sql = file_get_contents('e:\AUTOFLOW\AUTOMATION_FLOW\api\database.sql');
preg_match_all('/CREATE TABLE `(.*?)` \((.*?)\) ENGINE=/s', $sql, $matches);
$tables = [];
foreach($matches[1] as $idx => $tableName) {
    $columnsDef = $matches[2][$idx];
    preg_match_all('/`([^`]+)` ([a-zA-Z0-9_]+)/', $columnsDef, $colMatches);
    $tables[$tableName] = $colMatches[1];
}
echo "Total tables: " . count($tables) . "\n";
