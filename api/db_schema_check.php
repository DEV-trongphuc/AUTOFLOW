<?php
/**
 * MailFlow Pro - Database Integrity & Schema Validator
 * Concept: Standardizes tables for 10M scale, verifies collations, and ensures critical indexes exist.
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';

// Only allow from CLI or via secret key
if (php_sapi_name() !== 'cli' && (!isset($_GET['secret']) || $_GET['secret'] !== 'Ideas@812')) {
    die("Access denied. Please use CLI or provide correct secret.");
}

$isFix = isset($_GET['fix']) && $_GET['fix'] === 'true';
$results = [];

function addResult($type, $msg, $isErr = false)
{
    global $results;
    $results[] = [
        'type' => $type,
        'message' => $msg,
        'error' => $isErr
    ];
}

addResult('System', "Starting Database Schema Audit...");

// 1. Definition of "Standards"
$targetCollation = 'utf8mb4_unicode_ci';
$targetEngine = 'InnoDB';

$requiredSchema = [
    'subscribers' => [
        'columns' => ['id', 'email', 'phone_number', 'status', 'lead_score', 'last_activity_at', 'stats_opened', 'stats_clicked', 'custom_attributes'],
        'indexes' => ['email', 'phone_number', 'status', 'lead_score']
    ],
    'flows' => [
        'columns' => ['id', 'name', 'status', 'stat_enrolled', 'steps', 'config'],
        'indexes' => ['status']
    ],
    'subscriber_flow_states' => [
        'columns' => ['id', 'subscriber_id', 'flow_id', 'step_id', 'status', 'scheduled_at', 'updated_at'],
        'indexes' => [
            ['columns' => ['subscriber_id', 'flow_id'], 'name' => 'sub_flow'],
            ['columns' => ['status', 'scheduled_at'], 'name' => 'status_schedule'],
            ['columns' => ['updated_at'], 'name' => 'idx_updated_at'],
            ['columns' => ['flow_id', 'step_id', 'status'], 'name' => 'idx_flow_step_status']
        ]
    ],
    'subscriber_activity' => [
        'columns' => ['id', 'subscriber_id', 'type', 'flow_id', 'campaign_id', 'created_at'],
        'indexes' => [
            ['columns' => ['subscriber_id'], 'name' => 'idx_sub'],
            ['columns' => ['flow_id'], 'name' => 'idx_flow'],
            ['columns' => ['campaign_id'], 'name' => 'idx_camp'],
            ['columns' => ['type'], 'name' => 'idx_type'],
            ['columns' => ['subscriber_id', 'type', 'flow_id', 'created_at'], 'name' => 'idx_worker_check']
        ]
    ],
    'stats_update_buffer' => [
        'columns' => ['id', 'target_table', 'target_id', 'column_name', 'increment', 'processed', 'batch_id'],
        'indexes' => [
            ['columns' => ['processed', 'batch_id'], 'name' => 'idx_proc_batch']
        ]
    ],
    'queue_jobs' => [
        'columns' => ['id', 'queue', 'status', 'available_at', 'created_at'],
        'indexes' => [
            ['columns' => ['status', 'queue', 'available_at'], 'name' => 'idx_queue_run']
        ]
    ],
    'segment_exclusions' => [
        'columns' => ['id', 'segment_id', 'subscriber_id', 'excluded_at'],
        'indexes' => [
            ['columns' => ['segment_id', 'subscriber_id'], 'name' => 'unique_exclusion', 'unique' => true]
        ]
    ],
    'campaigns' => [
        'columns' => ['id', 'name', 'status', 'subject', 'template_id', 'count_sent', 'sent_at'],
        'indexes' => ['status', 'sent_at']
    ],
    'segments' => [
        'columns' => ['id', 'name', 'criteria', 'subscriber_count'],
        'indexes' => ['subscriber_count']
    ],
    'tags' => [
        'columns' => ['id', 'name'],
        'indexes' => [['columns' => ['name'], 'name' => 'uniq_name', 'unique' => true]]
    ],
    'lists' => [
        'columns' => ['id', 'name', 'subscriber_count'],
        'indexes' => ['subscriber_count']
    ],
    'zalo_subscribers' => [
        'columns' => ['id', 'zalo_user_id', 'subscriber_id', 'status', 'lead_score', 'is_follower', 'last_interaction_at'],
        'indexes' => [['columns' => ['zalo_user_id'], 'name' => 'idx_zalo_uid', 'unique' => true], 'subscriber_id', 'status', 'last_interaction_at']
    ],
    'web_visitors' => [
        'columns' => ['id', 'visitor_id', 'subscriber_id', 'last_seen_at', 'city', 'country'],
        'indexes' => [['columns' => ['visitor_id'], 'name' => 'idx_vid', 'unique' => true], 'subscriber_id', 'last_seen_at']
    ],
    'users' => [
        'columns' => ['id', 'email', 'password', 'role'],
        'indexes' => [['columns' => ['email'], 'name' => 'idx_email', 'unique' => true]]
    ],
    'zalo_delivery_logs' => [
        'columns' => ['id', 'flow_id', 'step_id', 'subscriber_id', 'oa_config_id', 'template_id', 'phone_number', 'template_data', 'status', 'zalo_msg_id', 'error_code', 'error_message', 'sent_at', 'created_at'],
        'indexes' => ['flow_id', 'subscriber_id', 'status', 'zalo_msg_id', 'sent_at']
    ],
    'zalo_subscriber_activity' => [
        'columns' => ['id', 'subscriber_id', 'type', 'created_at', 'zalo_msg_id', 'reference_id'],
        'indexes' => [
            ['columns' => ['subscriber_id', 'type'], 'name' => 'idx_sub_type'],
            ['columns' => ['zalo_msg_id'], 'name' => 'idx_zalo_msg', 'unique' => true],
            ['columns' => ['type', 'reference_id'], 'name' => 'idx_type_ref'],
            'created_at'
        ]
    ],
    'zalo_message_queue' => [
        'columns' => ['id', 'zalo_user_id', 'processed', 'created_at'],
        'indexes' => [['columns' => ['zalo_user_id', 'processed'], 'name' => 'idx_user_proc']]
    ],
    'zalo_broadcast_tracking' => [
        'columns' => ['id', 'broadcast_id', 'zalo_msg_id', 'status'],
        'indexes' => ['broadcast_id', 'zalo_msg_id', 'status']
    ],
    'zalo_automation_scenarios' => [
        'columns' => ['id', 'oa_config_id', 'type', 'trigger_text', 'match_type', 'status', 'ai_chatbot_id', 'schedule_type', 'priority_override'],
        'indexes' => ['oa_config_id', 'type', 'status']
    ],
    'web_sessions' => [
        'columns' => ['id', 'visitor_id', 'property_id', 'started_at', 'last_active_at', 'duration_seconds', 'is_bounce'],
        'indexes' => ['visitor_id', 'property_id', 'started_at', 'last_active_at']
    ],
    'web_page_views' => [
        'columns' => ['id', 'session_id', 'visitor_id', 'url_hash', 'loaded_at', 'time_on_page', 'is_entrance'],
        'indexes' => ['session_id', 'visitor_id', 'url_hash', 'loaded_at']
    ],
    'ai_conversations' => [
        'columns' => ['id', 'property_id', 'visitor_id', 'status', 'last_message_at'],
        'indexes' => ['property_id', 'visitor_id', 'status', 'last_message_at']
    ],
    'ai_messages' => [
        'columns' => ['id', 'conversation_id', 'sender', 'message', 'created_at'],
        'indexes' => ['conversation_id', 'sender', 'created_at']
    ],
    'zalo_user_messages' => [
        'columns' => ['id', 'zalo_user_id', 'direction', 'message_text', 'created_at'],
        'indexes' => ['zalo_user_id', 'direction', 'created_at']
    ],
    'ai_training_chunks' => [
        'columns' => ['id', 'doc_id', 'content', 'token_count'],
        'indexes' => ['doc_id']
    ],
    'zalo_oa_configs' => [
        'columns' => ['id', 'oa_id', 'name', 'status', 'token_expires_at'],
        'indexes' => [['columns' => ['oa_id'], 'name' => 'idx_oa_id', 'unique' => true], 'status']
    ],
    'zalo_templates' => [
        'columns' => ['id', 'template_id', 'oa_config_id', 'status'],
        'indexes' => ['oa_config_id', 'status']
    ],
    'ai_chatbots' => [
        'columns' => ['id', 'name', 'status', 'created_at'],
        'indexes' => ['status']
    ],
    'web_properties' => [
        'columns' => ['id', 'domain', 'status', 'api_key'],
        'indexes' => [['columns' => ['api_key'], 'name' => 'idx_api_key', 'unique' => true], 'status']
    ],
    'mail_delivery_logs' => [
        'columns' => ['id', 'recipient', 'subject', 'campaign_id', 'flow_id', 'reminder_id', 'status', 'error_message', 'sent_at', 'subscriber_id'],
        'indexes' => ['recipient', 'campaign_id', 'flow_id', 'reminder_id', 'status', 'sent_at', 'subscriber_id']
    ],
    'web_events' => [
        'columns' => ['id', 'session_id', 'event_type', 'created_at'],
        'indexes' => ['session_id', 'event_type', 'created_at']
    ],
    'web_daily_stats' => [
        'columns' => ['id', 'property_id', 'date', 'page_views', 'sessions'],
        'indexes' => [['columns' => ['property_id', 'date'], 'name' => 'idx_prop_date', 'unique' => true]]
    ],
    'zalo_broadcasts' => [
        'columns' => ['id', 'oa_config_id', 'status', 'scheduled_at'],
        'indexes' => ['oa_config_id', 'status', 'scheduled_at']
    ],
    'flow_enrollments' => [
        'columns' => ['id', 'subscriber_id', 'flow_id', 'enrolled_at'],
        'indexes' => [['columns' => ['subscriber_id', 'flow_id'], 'name' => 'idx_sub_flow']]
    ],
    'zalo_lists' => [
        'columns' => ['id', 'oa_config_id', 'name', 'subscriber_count'],
        'indexes' => ['oa_config_id']
    ],
    'subscriber_tags' => [
        'columns' => ['subscriber_id', 'tag_id'],
        'indexes' => [['columns' => ['subscriber_id', 'tag_id'], 'name' => 'idx_sub_tag', 'unique' => true]]
    ],
    'templates' => [
        'columns' => ['id', 'name', 'type', 'subject', 'group_id'],
        'indexes' => ['type']
    ],
    'template_groups' => [
        'columns' => ['id', 'name'],
        'indexes' => []
    ],
    'system_settings' => [
        'columns' => ['key', 'value'],
        'indexes' => [['columns' => ['key'], 'name' => 'idx_key', 'unique' => true]]
    ],
    'ai_training_docs' => [
        'columns' => ['id', 'chatbot_id', 'filename', 'status'],
        'indexes' => ['chatbot_id', 'status']
    ],
    'ai_vector_cache' => [
        'columns' => ['id', 'chunk_id', 'vector_id'],
        'indexes' => [['columns' => ['chunk_id'], 'name' => 'idx_chunk', 'unique' => true]]
    ],
    'system_logs' => [
        'columns' => ['id', 'level', 'message', 'created_at'],
        'indexes' => ['level', 'created_at']
    ],
    'raw_event_buffer' => [
        'columns' => ['id', 'payload', 'processed', 'created_at'],
        'indexes' => ['processed', 'created_at']
    ]
];

// 2. Perform Checks
try {
    // [DISCOVERY] Fetch ALL tables in the database
    $stmtAllTables = $pdo->query("SHOW TABLES");
    $allExistingTables = $stmtAllTables->fetchAll(PDO::FETCH_COLUMN);

    // Union of defined tables and existing tables
    $tablesToAudit = array_unique(array_merge(array_keys($requiredSchema), $allExistingTables));

    foreach ($tablesToAudit as $table) {
        $defined = isset($requiredSchema[$table]);
        $exists = in_array($table, $allExistingTables);

        if (!$exists && $defined) {
            addResult('Error', "Table `{$table}` is DEFINED but MISSING in Database!", true);
            continue;
        }

        if ($exists && !$defined) {
            addResult('Discovery', "Table `{$table}` found (not in core audit list). Performing general check.");
        } else {
            addResult('Table', "Auditing core table: `{$table}`");
        }

        // Check Table Status
        $stmtStatus = $pdo->query("SHOW TABLE STATUS LIKE '$table'");
        $status = $stmtStatus->fetch();

        if ($status['Engine'] !== $targetEngine) {
            addResult('Warning', "Table `{$table}` uses `{$status['Engine']}`, expected `{$targetEngine}`", true);
            if ($isFix) {
                $pdo->exec("ALTER TABLE `{$table}` ENGINE = {$targetEngine}");
                addResult('Fix', "Converted `{$table}` to {$targetEngine}");
            }
        }

        if ($status['Collation'] !== $targetCollation) {
            addResult('Warning', "Table `{$table}` collation is `{$status['Collation']}`, expected `{$targetCollation}`", true);
            if ($isFix) {
                $pdo->exec("ALTER TABLE `{$table}` CONVERT TO CHARACTER SET utf8mb4 COLLATE {$targetCollation}");
                addResult('Fix', "Converted `{$table}` to {$targetCollation}");
            }
        }

        // Check Columns and Indexes ONLY for defined core tables
        if ($defined) {
            $definition = $requiredSchema[$table];
            $stmtCols = $pdo->query("DESCRIBE `{$table}`");
            $existingCols = $stmtCols->fetchAll(PDO::FETCH_COLUMN);

            foreach ($definition['columns'] as $col) {
                if (!in_array($col, $existingCols)) {
                    addResult('Error', "Column `{$col}` is MISSING in `{$table}`", true);
                    if ($isFix) {
                        try {
                            if ($table === 'stats_update_buffer' && $col === 'batch_id') {
                                $pdo->exec("ALTER TABLE stats_update_buffer ADD COLUMN batch_id VARCHAR(50) DEFAULT NULL AFTER processed");
                            } elseif ($table === 'zalo_subscribers' && $col === 'subscriber_id') {
                                $pdo->exec("ALTER TABLE zalo_subscribers ADD COLUMN subscriber_id char(36) DEFAULT NULL AFTER zalo_user_id");
                            } elseif ($table === 'zalo_subscribers' && $col === 'is_follower') {
                                $pdo->exec("ALTER TABLE zalo_subscribers ADD COLUMN is_follower TINYINT(1) DEFAULT 0");
                            } elseif ($table === 'zalo_subscribers' && $col === 'last_interaction_at') {
                                $pdo->exec("ALTER TABLE zalo_subscribers ADD COLUMN last_interaction_at DATETIME DEFAULT NULL");
                            } elseif ($col === 'zalo_msg_id') {
                                $pdo->exec("ALTER TABLE `{$table}` ADD COLUMN zalo_msg_id VARCHAR(100) DEFAULT NULL");
                            } elseif ($table === 'zalo_subscriber_activity' && $col === 'reference_id') {
                                $pdo->exec("ALTER TABLE zalo_subscriber_activity ADD COLUMN reference_id VARCHAR(100) DEFAULT NULL AFTER type");
                            } elseif ($table === 'zalo_delivery_logs' && $col === 'error_code') {
                                $pdo->exec("ALTER TABLE zalo_delivery_logs ADD COLUMN error_code VARCHAR(50) DEFAULT NULL");
                            } elseif ($table === 'web_visitors' && $col === 'visitor_id') {
                                $pdo->exec("ALTER TABLE web_visitors ADD COLUMN visitor_id VARCHAR(100) DEFAULT NULL AFTER id");
                            } elseif ($table === 'web_visitors' && ($col === 'city' || $col === 'country')) {
                                $pdo->exec("ALTER TABLE web_visitors ADD COLUMN `{$col}` VARCHAR(100) DEFAULT NULL");
                            } elseif ($table === 'web_visitors' && $col === 'last_seen_at') {
                                $pdo->exec("ALTER TABLE web_visitors ADD COLUMN last_seen_at DATETIME DEFAULT NULL");
                            } elseif ($table === 'users' && $col === 'role') {
                                $pdo->exec("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user' AFTER password");
                            } elseif ($table === 'zalo_automation_scenarios' && $col === 'ai_chatbot_id') {
                                $pdo->exec("ALTER TABLE zalo_automation_scenarios ADD COLUMN ai_chatbot_id VARCHAR(50) DEFAULT NULL");
                            } elseif ($table === 'zalo_automation_scenarios' && $col === 'match_type') {
                                $pdo->exec("ALTER TABLE zalo_automation_scenarios ADD COLUMN match_type ENUM('exact', 'contains') DEFAULT 'exact'");
                            } elseif ($table === 'zalo_automation_scenarios' && $col === 'schedule_type') {
                                $pdo->exec("ALTER TABLE zalo_automation_scenarios ADD COLUMN schedule_type ENUM('full', 'custom', 'daily_range', 'date_range') DEFAULT 'full'");
                            } elseif ($table === 'zalo_automation_scenarios' && $col === 'priority_override') {
                                $pdo->exec("ALTER TABLE zalo_automation_scenarios ADD COLUMN priority_override TINYINT(1) DEFAULT 0");
                            } elseif ($table === 'web_sessions' && $col === 'duration_seconds') {
                                $pdo->exec("ALTER TABLE web_sessions ADD COLUMN duration_seconds INT DEFAULT 0");
                            } elseif ($table === 'web_sessions' && $row['is_bounce']) {
                                $pdo->exec("ALTER TABLE web_sessions ADD COLUMN is_bounce TINYINT(1) DEFAULT 1");
                            } elseif ($table === 'web_page_views' && $col === 'time_on_page') {
                                $pdo->exec("ALTER TABLE web_page_views ADD COLUMN time_on_page INT DEFAULT 0");
                            } elseif ($table === 'web_page_views' && $col === 'is_entrance') {
                                $pdo->exec("ALTER TABLE web_page_views ADD COLUMN is_entrance TINYINT(1) DEFAULT 0");
                            } elseif ($table === 'ai_messages' && $col === 'sender') {
                                $pdo->exec("ALTER TABLE ai_messages ADD COLUMN sender ENUM('visitor', 'ai', 'human', 'system') DEFAULT 'visitor'");
                            } elseif ($table === 'ai_training_chunks' && $col === 'content') {
                                $pdo->exec("ALTER TABLE ai_training_chunks ADD COLUMN content MEDIUMTEXT");
                            } elseif ($table === 'zalo_user_messages' && $col === 'direction') {
                                $pdo->exec("ALTER TABLE zalo_user_messages ADD COLUMN direction ENUM('inbound', 'outbound') DEFAULT 'inbound'");
                            } else {
                                // Default fallback (VARCHAR 255)
                                $pdo->exec("ALTER TABLE `{$table}` ADD COLUMN `{$col}` VARCHAR(255) DEFAULT NULL");
                            }
                            addResult('Fix', "Added missing column `{$col}` to `{$table}`.");
                        } catch (Exception $e) {
                            addResult('Error', "Failed to add column `{$col}`: " . $e->getMessage(), true);
                        }
                    }
                }
            }

            // Check Indexes
            $stmtIdx = $pdo->query("SHOW INDEX FROM `{$table}`");
            $existingIndexes = [];
            foreach ($stmtIdx->fetchAll() as $row) {
                $existingIndexes[$row['Key_name']][] = $row['Column_name'];
            }

            foreach ($definition['indexes'] as $idx) {
                if (is_string($idx)) {
                    $idxName = "idx_" . $idx;
                    $cols = [$idx];
                } else {
                    $idxName = $idx['name'];
                    $cols = $idx['columns'];
                }

                $found = false;
                foreach ($existingIndexes as $name => $idxCols) {
                    if (array_values($idxCols) === array_values($cols)) {
                        $found = true;
                        break;
                    }
                }

                if (!$found) {
                    addResult('Warning', "Missing Index on `{$table}`: " . implode(', ', $cols), true);
                    if ($isFix) {
                        $idxType = (isset($idx['unique']) && $idx['unique']) ? "UNIQUE INDEX" : "INDEX";
                        try {
                            // [SPECIAL HANDLING] Deduplicate web_daily_stats if applying unique index on property_id, date
                            if ($table === 'web_daily_stats' && isset($idx['unique']) && $idx['name'] === 'idx_prop_date') {
                                addResult('System', "Attempting to merge duplicates in `web_daily_stats` before creating index...");
                                $pdo->exec("
                                    CREATE TEMPORARY TABLE tmp_web_stats AS
                                    SELECT MIN(id) as id, property_id, date, SUM(page_views) as page_views, SUM(sessions) as sessions
                                    FROM web_daily_stats
                                    GROUP BY property_id, date
                                ");
                                $pdo->exec("DELETE FROM web_daily_stats");
                                $pdo->exec("INSERT INTO web_daily_stats (id, property_id, date, page_views, sessions) SELECT id, property_id, date, page_views, sessions FROM tmp_web_stats");
                                $pdo->exec("DROP TEMPORARY TABLE tmp_web_stats");
                            }

                            $pdo->exec("CREATE $idxType `$idxName` ON `{$table}` (" . implode(',', $cols) . ")");
                            addResult('Fix', "Created index `$idxName` on `{$table}`.");
                        } catch (Exception $e) {
                            addResult('Error', "Failed to create index: " . $e->getMessage(), true);
                        }
                    }
                }
            }
        }
    }

    addResult('System', "Audit Over. All discovered tables checked.");

} catch (Exception $e) {
    addResult('Fatal', "Audit failed: " . $e->getMessage(), true);
}

// 3. Output
if (php_sapi_name() === 'cli' || (isset($_GET['output']) && $_GET['output'] === 'text')) {
    foreach ($results as $r) {
        $prefix = $r['error'] ? "[!] " : "[i] ";
        echo str_pad($r['type'], 10) . " | " . $prefix . $r['message'] . "\n";
    }
} else {
    echo json_encode([
        'success' => true,
        'audit_results' => $results
    ], JSON_PRETTY_PRINT);
}
