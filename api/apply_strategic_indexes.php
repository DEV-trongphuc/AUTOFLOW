<?php
require_once 'db_connect.php';
header('Content-Type: application/json');

/**
 * STRATEGY: 
 * 1. INDEXING for Search (Email, Phone, Name)
 * 2. INDEXING for Performance (sorting by time, property filtering)
 * 3. COMPOSITE INDEXES for common dashboard queries
 */

try {
    $logs = [];

    // --- 1. Table: subscribers (Search & Identity) ---
    $pdo->exec("ALTER TABLE subscribers ADD INDEX IF NOT EXISTS idx_sub_email (email)");
    $pdo->exec("ALTER TABLE subscribers ADD INDEX IF NOT EXISTS idx_sub_phone (phone_number)");
    $pdo->exec("ALTER TABLE subscribers ADD INDEX IF NOT EXISTS idx_sub_status_source (status, source)");
    $logs[] = "Indexed subscribers (Email, Phone, Status/Source).";

    // --- 2. Table: web_visitors (Dashboard List) ---
    // Composite index for fetching visitors by property, sorted by last visit
    $pdo->exec("ALTER TABLE web_visitors ADD INDEX IF NOT EXISTS idx_vis_prop_lastvisit (property_id, last_visit_at)");
    $pdo->exec("ALTER TABLE web_visitors ADD INDEX IF NOT EXISTS idx_vis_email (email)");
    $pdo->exec("ALTER TABLE web_visitors ADD INDEX IF NOT EXISTS idx_vis_phone (phone)");
    $logs[] = "Indexed web_visitors (Property+LastVisit, Identity fields).";

    // --- 3. Table: web_sessions (Live tracking & Analytics) ---
    // Composite for finding recent active sessions for a property
    $pdo->exec("ALTER TABLE web_sessions ADD INDEX IF NOT EXISTS idx_sess_prop_active (property_id, last_active_at)");
    $pdo->exec("ALTER TABLE web_sessions ADD INDEX IF NOT EXISTS idx_sess_visitor (visitor_id, property_id)");
    $logs[] = "Indexed web_sessions (Property+ActiveTime, Visitor mapping).";

    // --- 4. Table: web_page_views (Journey Timeline) ---
    // Critical for fast loading of the visitor journey
    $pdo->exec("ALTER TABLE web_page_views ADD INDEX IF NOT EXISTS idx_pv_sess_time (session_id, loaded_at)");
    $pdo->exec("ALTER TABLE web_page_views ADD INDEX IF NOT EXISTS idx_pv_vis_prop (visitor_id, property_id, loaded_at)");
    $logs[] = "Indexed web_page_views (Session Timeline, Visitor Journey).";

    // --- 5. Table: web_events (Event Stream) ---
    // For specific event analysis (clicks, forms, etc.)
    $pdo->exec("ALTER TABLE web_events ADD INDEX IF NOT EXISTS idx_evt_pv_type (page_view_id, event_type)");
    $pdo->exec("ALTER TABLE web_events ADD INDEX IF NOT EXISTS idx_evt_vis_time (visitor_id, created_at)");
    $logs[] = "Indexed web_events (Performance by type and time).";

    // --- 6. [NEW] Table: ai_rag_search_cache (RAG Optimization) ---
    $pdo->exec("ALTER TABLE ai_rag_search_cache ADD INDEX IF NOT EXISTS idx_rag_created (created_at)");
    $logs[] = "Indexed ai_rag_search_cache (Retention/Cleanup).";

    // --- 7. [NEW] Table: zalo_subscribers (Zalo Performance) ---
    $pdo->exec("ALTER TABLE zalo_subscribers ADD INDEX IF NOT EXISTS idx_zalo_joined (joined_at)");
    $pdo->exec("ALTER TABLE zalo_subscribers ADD INDEX IF NOT EXISTS idx_last_interaction (last_interaction_at)");
    $logs[] = "Indexed zalo_subscribers (Joined Date, Interaction Time).";

    // --- 8. [NEW] Table: subscriber_flow_states (Flow Efficiency) ---
    $pdo->exec("ALTER TABLE subscriber_flow_states ADD INDEX IF NOT EXISTS idx_flow_status_sched (status, scheduled_at)");
    $logs[] = "Indexed subscriber_flow_states (Worker performance).";

    // --- 9. [PART 2] Table: subscriber_activity (Activity Tracking) ---
    $pdo->exec("ALTER TABLE subscriber_activity ADD INDEX IF NOT EXISTS idx_subscriber_type_created (subscriber_id, type, created_at)");
    $pdo->exec("ALTER TABLE subscriber_activity ADD INDEX IF NOT EXISTS idx_campaign_type (campaign_id, type)");
    $logs[] = "Indexed subscriber_activity (Subscriber+Type+Time, Campaign+Type).";

    // --- 10. [PART 2] Table: tags (Tag Lookup & Uniqueness) ---
    $pdo->exec("ALTER TABLE tags ADD UNIQUE INDEX IF NOT EXISTS idx_tag_name (name)");
    $logs[] = "Indexed tags (Unique Name).";

    echo json_encode(['success' => true, 'message' => 'STRATEGIC INDEXING COMPLETE!', 'details' => $logs]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
