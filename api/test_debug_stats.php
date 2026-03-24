<?php
// api/test_debug_stats.php
require_once 'db_connect.php';
require_once 'ai_org_middleware.php';

session_start();

// Auth Check: Admin only or development mode
if (!isset($_SESSION['org_user_id']) && strpos($_SERVER['HTTP_HOST'] ?? '', 'localhost') === false) {
    echo json_encode(['success' => false, 'message' => 'Access Denied']);
    exit;
}

$action = $_GET['action'] ?? 'debug';
$categoryIdRaw = $_GET['category_id'] ?? $_GET['property_id'] ?? null;
$resolvedId = $categoryIdRaw ? resolvePropertyId($pdo, $categoryIdRaw) : null;

$response = [
    'input_category_id' => $categoryIdRaw,
    'resolved_category_id' => $resolvedId,
    'session_user_id' => $_SESSION['org_user_id'] ?? 'null',
    'session_role' => $_SESSION['org_user_role'] ?? 'null',
    'get_params' => $_GET,
    'debug_queries' => []
];

try {
    if ($action === 'debug') {
        // Test Category Existence
        if ($resolvedId) {
            $stmt = $pdo->prepare("SELECT * FROM ai_chatbot_categories WHERE id = ?");
            $stmt->execute([$resolvedId]);
            $response['category_info'] = $stmt->fetch();

            // Test Bots in Category
            $stmt = $pdo->prepare("SELECT id, name FROM ai_chatbots WHERE category_id = ?");
            $stmt->execute([$resolvedId]);
            $response['bots_in_category'] = $stmt->fetchAll();
        }

        // Test General Counts
        $sql = "SELECT (SELECT COUNT(*) FROM ai_conversations) as public_convs, 
                       (SELECT COUNT(*) FROM ai_org_conversations) as org_convs,
                       (SELECT COUNT(*) FROM ai_chatbots) as total_bots";
        $response['general_counts'] = $pdo->query($sql)->fetch();

        // Test Category-filtered Counts
        if ($resolvedId) {
            $sqlFiltered = "SELECT 
                (SELECT COUNT(*) FROM ai_conversations c JOIN ai_chatbots b ON c.property_id = b.id WHERE b.category_id = ?) as filtered_public_convs,
                (SELECT COUNT(*) FROM ai_org_conversations oc JOIN ai_chatbots b2 ON oc.property_id = b2.id WHERE b2.category_id = ?) as filtered_org_convs,
                (SELECT COUNT(*) FROM ai_chatbots WHERE category_id = ?) as filtered_total_bots";
            $stmt = $pdo->prepare($sqlFiltered);
            $stmt->execute([$resolvedId, $resolvedId, $resolvedId]);
            $response['filtered_counts'] = $stmt->fetch();
        }

        // Test User Stats Query logic (Single user sample)
        $sqlUser = "SELECT u.id, u.full_name, u.email FROM ai_org_users u LIMIT 5";
        $response['sample_users'] = $pdo->query($sqlUser)->fetchAll();
    }

    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
