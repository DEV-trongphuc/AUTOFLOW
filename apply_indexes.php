<?php
require_once 'api/db_connect.php';

try {
    $pdo->query("CREATE INDEX idx_subact_type_ref ON subscriber_activity (type, reference_id)");
    echo "Index idx_subact_type_ref created.\n";
} catch (Exception $e) {
    echo "Error creating idx_subact_type_ref: " . $e->getMessage() . "\n";
}

try {
    $pdo->query("CREATE INDEX idx_subact_feed ON subscriber_activity (subscriber_id, created_at DESC)");
    echo "Index idx_subact_feed created.\n";
} catch (Exception $e) {
    echo "Error creating idx_subact_feed: " . $e->getMessage() . "\n";
}

try {
    $pdo->query("CREATE INDEX idx_zalo_sub_oa ON zalo_subscribers (zalo_user_id, admin_id)");
    echo "Index idx_zalo_sub_oa created.\n";
} catch (Exception $e) {
    echo "Error creating idx_zalo_sub_oa: " . $e->getMessage() . "\n";
}

echo "Done.\n";
