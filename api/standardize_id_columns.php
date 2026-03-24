<?php
/**
 * api/standardize_id_columns.php
 * 
 * This script standardizes ID-related columns to VARCHAR(100) across all AI tables
 * to ensure consistency and prevent data truncation.
 */

require_once 'db_connect.php';

header('Content-Type: application/json');

function logStandard($msg)
{
    echo $msg . "\n";
}

$tables_columns = [
    'ai_conversations' => ['id', 'visitor_id', 'property_id'],
    'ai_org_conversations' => ['id', 'visitor_id', 'property_id', 'user_id'],
    'ai_messages' => ['conversation_id'],
    'ai_org_messages' => ['conversation_id'],
    'ai_training_docs' => ['id', 'property_id', 'parent_id', 'chatbot_id'],
    'ai_training_chunks' => ['id', 'property_id', 'doc_id'],
    'ai_chatbot_settings' => ['property_id'],
    'global_assets' => ['id', 'property_id', 'conversation_id', 'admin_id'],
    'admin_logs' => ['admin_id']
];

$results = [];

logStandard("--- STARTING ID COLUMN STANDARDIZATION ---");

foreach ($tables_columns as $table => $columns) {
    try {
        // Check if table exists
        $tableCheck = $pdo->query("SHOW TABLES LIKE '$table'");
        if ($tableCheck->rowCount() === 0) {
            $results[] = ["table" => $table, "status" => "skipped", "message" => "Table not found"];
            continue;
        }

        foreach ($columns as $column) {
            // Check current column definition
            $stmt = $pdo->query("SHOW COLUMNS FROM `$table` LIKE '$column'");
            $colInfo = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($colInfo) {
                $type = strtolower($colInfo['Type']);
                $isNull = $colInfo['Null'] === 'YES' ? 'NULL' : 'NOT NULL';
                $default = $colInfo['Default'] !== null ? "DEFAULT '" . $colInfo['Default'] . "'" : ($colInfo['Null'] === 'YES' ? "DEFAULT NULL" : "");

                // Only modify if not already varchar(100) or if it's an int that needs conversion
                if ($type !== 'varchar(100)') {
                    logStandard("Standardizing $table.$column (currently $type)...");

                    // We need to be careful with PRIMARY KEYs and Foreign Keys
                    // For simply standardizing length, ALTER TABLE MODIFY is usually fine
                    $sql = "ALTER TABLE `$table` MODIFY COLUMN `$column` VARCHAR(100) $isNull $default";
                    $pdo->exec($sql);

                    $results[] = ["table" => $table, "column" => $column, "status" => "success", "message" => "Standardized to VARCHAR(100)"];
                } else {
                    $results[] = ["table" => $table, "column" => $column, "status" => "skipped", "message" => "Already VARCHAR(100)"];
                }
            } else {
                $results[] = ["table" => $table, "column" => $column, "status" => "error", "message" => "Column not found"];
            }
        }
    } catch (Exception $e) {
        $results[] = ["table" => $table, "status" => "error", "message" => $e->getMessage()];
    }
}

logStandard("--- STANDARDIZATION COMPLETE ---");

echo json_encode(['success' => true, 'results' => $results], JSON_PRETTY_PRINT);
