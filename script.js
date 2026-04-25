const fs = require('fs');
let content = fs.readFileSync('e:/AUTOFLOW/AUTOMATION_FLOW/api/flows.php', 'utf8');

content = content.replace(
    /\$linkFilter = \$_GET\['link'\] \?\? null;/,
    "$linkFilter = $_GET['link'] ?? null;\n        $branchFilter = $_GET['branch'] ?? null;"
);

// 2. all_touched COUNT modification
let countSqlTarget = `                // Direct unique count on Activity table (fast with index)\\n                $countSql = "SELECT COUNT(DISTINCT subscriber_id) \\n                             FROM subscriber_activity \\n                             WHERE flow_id = ? AND $stepIdClause AND type IN (\\'$typePlaceholders\\')";\\n                $stmtCount = $pdo->prepare($countSql);\\n                $stmtCount->execute(array_merge([$flowId], $stepIdParams));`;
countSqlTarget = countSqlTarget.replace(/\\\\n/g, '\\n');

let countSqlReplacement = `                $countSql = "SELECT COUNT(DISTINCT sa.subscriber_id) \\n                             FROM subscriber_activity sa\\n                             WHERE sa.flow_id = ? AND " . str_replace(\\'reference_id\\', \\'sa.reference_id\\', $stepIdClause) . " AND sa.type IN (\\'$typePlaceholders\\')";\\n                $countParamsExec = array_merge([$flowId], $stepIdParams);\\n                if ($branchFilter) {\\n                    $countSql .= " AND EXISTS (SELECT 1 FROM subscriber_activity b WHERE b.flow_id = sa.flow_id AND b.subscriber_id = sa.subscriber_id AND " . str_replace(\\'reference_id\\', \\'b.reference_id\\', $stepIdClause) . " AND b.type IN (\\'advanced_condition\\', \\'condition_true\\', \\'condition_false\\', \\'ab_test_a\\', \\'ab_test_b\\', \\'split_test\\') AND (b.details LIKE ? OR b.details LIKE ?))";\\n                    $countParamsExec[] = "%Matched: $branchFilter%";\\n                    $countParamsExec[] = "%Condition matched: $branchFilter%";\\n                }\\n                $stmtCount = $pdo->prepare($countSql);\\n                $stmtCount->execute($countParamsExec);`;
countSqlReplacement = countSqlReplacement.replace(/\\\\n/g, '\\n');

content = content.replace(countSqlTarget, countSqlReplacement);

// all_touched COUNT search modification
let countSearchSqlTarget = `                $countSql = "SELECT COUNT(DISTINCT sa.subscriber_id) \\n                             FROM subscriber_activity sa\\n                             JOIN subscribers s_search ON sa.subscriber_id = s_search.id\\n                             WHERE sa.flow_id = ? AND sa.$stepIdClause AND sa.type IN (\\'$typePlaceholders\\')\\n                             AND (s_search.email LIKE ? OR s_search.first_name LIKE ? OR s_search.last_name LIKE ?)";\\n                $stmtCount = $pdo->prepare($countSql);\\n                $stmtCount->execute($countParams);`;
countSearchSqlTarget = countSearchSqlTarget.replace(/\\\\n/g, '\\n');

let countSearchSqlReplacement = `                $countSql = "SELECT COUNT(DISTINCT sa.subscriber_id) \\n                             FROM subscriber_activity sa\\n                             JOIN subscribers s_search ON sa.subscriber_id = s_search.id\\n                             WHERE sa.flow_id = ? AND " . str_replace(\\'reference_id\\', \\'sa.reference_id\\', $stepIdClause) . " AND sa.type IN (\\'$typePlaceholders\\')\\n                             AND (s_search.email LIKE ? OR s_search.first_name LIKE ? OR s_search.last_name LIKE ?)";\\n                if ($branchFilter) {\\n                    $countSql .= " AND EXISTS (SELECT 1 FROM subscriber_activity b WHERE b.flow_id = sa.flow_id AND b.subscriber_id = sa.subscriber_id AND " . str_replace(\\'reference_id\\', \\'b.reference_id\\', $stepIdClause) . " AND b.type IN (\\'advanced_condition\\', \\'condition_true\\', \\'condition_false\\', \\'ab_test_a\\', \\'ab_test_b\\', \\'split_test\\') AND (b.details LIKE ? OR b.details LIKE ?))";\\n                    $countParams[] = "%Matched: $branchFilter%";\\n                    $countParams[] = "%Condition matched: $branchFilter%";\\n                }\\n                $stmtCount = $pdo->prepare($countSql);\\n                $stmtCount->execute($countParams);`;
countSearchSqlReplacement = countSearchSqlReplacement.replace(/\\\\n/g, '\\n');

content = content.replace(countSearchSqlTarget, countSearchSqlReplacement);

// 3. all_touched fetch modification
let fetchSqlTarget = `            $sql = "SELECT s.id, s.email, s.phone_number, s.first_name, s.last_name, \\n                           u.entered_at,\\n                           \\'processed\\' as status,\\n                           ? as step_id\\n                    FROM ($historySql) as u`;
fetchSqlTarget = fetchSqlTarget.replace(/\\\\n/g, '\\n');

let fetchSqlReplacement = `            $sql = "SELECT s.id, s.email, s.phone_number, s.first_name, s.last_name, \\n                           u.entered_at,\\n                           \\'processed\\' as status,\\n                           ? as step_id,\\n                           (SELECT details FROM subscriber_activity WHERE flow_id = ? AND subscriber_id = s.id AND " . str_replace(\\'reference_id\\', \\'reference_id\\', $stepIdClause) . " AND type IN (\\'advanced_condition\\', \\'condition_true\\', \\'condition_false\\', \\'ab_test_a\\', \\'ab_test_b\\', \\'split_test\\') ORDER BY id DESC LIMIT 1) as branch_details\\n                    FROM ($historySql) as u`;
fetchSqlReplacement = fetchSqlReplacement.replace(/\\\\n/g, '\\n');

content = content.replace(fetchSqlTarget, fetchSqlReplacement);

// Add the 2 extra bindings for flow_id and stepIdParams in fetchParams
let fetchParamsTarget = `            $fetchParams = array_merge([$stepId, $flowId], $stepIdParams, [$flowId], $stepIdParams);`;
let fetchParamsReplacement = `            // The fetch SQL needs: stepId, flowId, stepIdParams (for branch_details subquery), flowId, stepIdParams (for historySql), flowId, stepIdParams (for LEFT JOIN)\n            $fetchParams = array_merge([$stepId, $flowId], $stepIdParams, [$flowId], $stepIdParams, [$flowId], $stepIdParams);\n            if ($branchFilter) {\n                $sql .= " HAVING branch_details LIKE ? OR branch_details LIKE ?";\n            }`;
content = content.replace(fetchParamsTarget, fetchParamsReplacement);

let execTarget = `$stmt = $pdo->prepare($sql);\n            $stmt->execute($fetchParams);`;
let execReplacement = `if ($branchFilter) {\n                $fetchParams[] = "%Matched: $branchFilter%";\n                $fetchParams[] = "%Condition matched: $branchFilter%";\n            }\n            $stmt = $pdo->prepare($sql);\n            $stmt->execute($fetchParams);`;
content = content.replace(execTarget, execReplacement);

// Map branchName
let mapTarget1 = `                    \\'completedAt\\' => $p[\\'entered_at\\'],\n                    \\'scheduledAt\\' => null,\n                    \\'phone\\' => $p[\\'phone_number\\']`;
let mapReplacement1 = `                    \\'completedAt\\' => $p[\\'entered_at\\'],\n                    \\'scheduledAt\\' => null,\n                    \\'phone\\' => $p[\\'phone_number\\'],\n                    \\'branchName\\' => isset($p[\\'branch_details\\']) ? str_replace([\\'Matched: \\', \\'Advanced Condition matched: \\'], \\'\\', $p[\\'branch_details\\']) : null`;
content = content.replace(mapTarget1, mapReplacement1);


// 4. normal query COUNT modification
let normalCountTarget = `            $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM subscriber_flow_states sfs JOIN subscribers s ON sfs.subscriber_id = s.id WHERE $whereSql");\n            $stmtCount->execute($allParams);`;

let normalCountReplacement = `            if ($branchFilter) {\n                $whereSql .= " AND EXISTS (SELECT 1 FROM subscriber_activity b WHERE b.flow_id = sfs.flow_id AND b.subscriber_id = s.id AND b.reference_id = sfs.step_id AND b.type IN (\\'advanced_condition\\', \\'condition_true\\', \\'condition_false\\', \\'ab_test_a\\', \\'ab_test_b\\', \\'split_test\\') AND (b.details LIKE ? OR b.details LIKE ?))";\n                $allParams[] = "%Matched: $branchFilter%";\n                $allParams[] = "%Condition matched: $branchFilter%";\n            }\n            $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM subscriber_flow_states sfs JOIN subscribers s ON sfs.subscriber_id = s.id WHERE $whereSql");\n            $stmtCount->execute($allParams);`;
content = content.replace(normalCountTarget, normalCountReplacement);

// 5. normal query fetch modification
let normalFetchTarget = `            $sql = "SELECT s.id, s.email, s.phone_number, s.first_name, s.last_name, sfs.step_id, sfs.status, sfs.scheduled_at, sfs.created_at as entered_at, sfs.updated_at, sfs.last_error\\n                    FROM subscriber_flow_states sfs\\n                    JOIN subscribers s ON sfs.subscriber_id = s.id\\n                    WHERE $whereSql\\n                    ORDER BY sfs.updated_at DESC, sfs.created_at DESC LIMIT $limit OFFSET $offset";`;
normalFetchTarget = normalFetchTarget.replace(/\\\\n/g, '\\n');

let normalFetchReplacement = `            $sql = "SELECT s.id, s.email, s.phone_number, s.first_name, s.last_name, sfs.step_id, sfs.status, sfs.scheduled_at, sfs.created_at as entered_at, sfs.updated_at, sfs.last_error,\\n                           (SELECT details FROM subscriber_activity b WHERE b.flow_id = sfs.flow_id AND b.subscriber_id = s.id AND b.reference_id = sfs.step_id AND b.type IN (\\'advanced_condition\\', \\'condition_true\\', \\'condition_false\\', \\'ab_test_a\\', \\'ab_test_b\\', \\'split_test\\') ORDER BY id DESC LIMIT 1) as branch_details\\n                    FROM subscriber_flow_states sfs\\n                    JOIN subscribers s ON sfs.subscriber_id = s.id\\n                    WHERE $whereSql\\n                    ORDER BY sfs.updated_at DESC, sfs.created_at DESC LIMIT $limit OFFSET $offset";`;
normalFetchReplacement = normalFetchReplacement.replace(/\\\\n/g, '\\n');
content = content.replace(normalFetchTarget, normalFetchReplacement);

// Map branchName for normal
let mapTarget2 = `                    \\'enteredAt\\' => $p[\\'entered_at\\'],\n                    \\'lastError\\' => $p[\\'last_error\\'] ?? null,\n                    \\'completion_count\\' => (int) ($counts[$p[\\'id\\']] ?? 1)`;
let mapReplacement2 = `                    \\'enteredAt\\' => $p[\\'entered_at\\'],\n                    \\'lastError\\' => $p[\\'last_error\\'] ?? null,\n                    \\'branchName\\' => isset($p[\\'branch_details\\']) ? str_replace([\\'Matched: \\', \\'Advanced Condition matched: \\'], \\'\\', $p[\\'branch_details\\']) : null,\n                    \\'completion_count\\' => (int) ($counts[$p[\\'id\\']] ?? 1)`;
content = content.replace(mapTarget2, mapReplacement2);

fs.writeFileSync('e:/AUTOFLOW/AUTOMATION_FLOW/api/flows.php', content);
console.log('flows.php updated successfully');
