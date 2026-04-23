<?php
$file = 'e:/AUTOFLOW/AUTOMATION_FLOW/api/campaigns.php';
$content = file_get_contents($file);

// 1. Fix audience_stats route
$old1 = '$countSql = "SELECT COUNT(DISTINCT s.id) FROM subscribers s WHERE s.status IN (\'active\', \'lead\', \'customer\')";';
$new1 = '$countSql = "SELECT COUNT(DISTINCT s.id) FROM subscribers s WHERE s.workspace_id = ? AND s.status IN (\'active\', \'lead\', \'customer\')";';
$content = str_replace($old1, $new1, $content);

// 2. Fix params in audience_stats (after first countSql replacement)
$old2 = '$countParams = [];';
$new2 = '$countParams = [$workspace_id];';
// We only want to replace the first few occurrences in these routes
$content = str_replace($old2, $new2, $content);

file_put_contents($file, $content);
echo "Replacement Done";
