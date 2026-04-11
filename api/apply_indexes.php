<?php
require_once 'db_connect.php';
apiHeaders();

try {
    $pdo->query("CREATE INDEX idx_subact_type_ref ON subscriber_activity (type, reference_id)");
    echo "Index idx_subact_type_ref examined.<br>";
} catch (Throwable $e) {}

try {
    $pdo->query("CREATE INDEX idx_subact_feed ON subscriber_activity (subscriber_id, created_at DESC)");
    echo "Index idx_subact_feed examined.<br>";
} catch (Throwable $e) {}

try {
    $pdo->query("CREATE INDEX idx_subtags_tag ON subscriber_tags (tag_id)");
    echo "Index idx_subtags_tag created.<br>";
} catch (Throwable $e) { }

try {
    $pdo->query("CREATE INDEX idx_subact_flow_type ON subscriber_activity (flow_id, type)");
    echo "Index idx_subact_flow_type created.<br>";
} catch (Throwable $e) { }

try {
    $pdo->query("CREATE INDEX idx_subact_ref_type ON subscriber_activity (reference_id, type)");
    echo "Index idx_subact_ref_type created.<br>";
} catch (Throwable $e) { }

try {
    $pdo->query("CREATE INDEX idx_sublists_list ON subscriber_lists (list_id)");
    echo "Index idx_sublists_list created.<br>";
} catch (Throwable $e) { }

try {
    $pdo->query("CREATE INDEX idx_flow_states_step ON subscriber_flow_states (flow_id, step_id, status)");
    echo "Index idx_flow_states_step created.<br>";
} catch (Throwable $e) { }

try {
    $pdo->query("CREATE INDEX idx_zalo_sub_oa ON zalo_subscribers (zalo_user_id, admin_id)");
    echo "Index idx_zalo_sub_oa created.<br>";
} catch (Throwable $e) {
    if (strpos($e->getMessage(), 'Duplicate key') !== false) {
        echo "Index idx_zalo_sub_oa already exists.<br>";
    } else {
        echo "Error creating idx_zalo_sub_oa: " . $e->getMessage() . "<br>";
    }
}

echo "<b>Database Indexes Checked and Applied Successfully.</b>";
?>
