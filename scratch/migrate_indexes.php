<?php
require_once __DIR__ . '/../api/db_connect.php';

try {
    $pdo->exec("ALTER TABLE link_clicks ADD INDEX idx_link_clicks_slug_time (short_link_id, clicked_at)");
    echo "Index idx_link_clicks_slug_time created.\n";
} catch (Exception $e) {
    if (strpos($e->getMessage(), 'Duplicate key name') !== false) {
        echo "Index idx_link_clicks_slug_time already exists.\n";
    } else {
        echo "Error link_clicks: " . $e->getMessage() . "\n";
    }
}

try {
    $pdo->exec("ALTER TABLE survey_responses ADD INDEX idx_survey_responses_id_time (survey_id, created_at)");
    echo "Index idx_survey_responses_id_time created.\n";
} catch (Exception $e) {
    if (strpos($e->getMessage(), 'Duplicate key name') !== false) {
         echo "Index idx_survey_responses_id_time already exists.\n";
    } else {
         echo "Error survey_responses: " . $e->getMessage() . "\n";
    }
}
