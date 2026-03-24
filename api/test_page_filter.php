<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

$results = [];

// 1. Test get_available_pages
$action = 'get_available_pages';
$pages = [];
$stmtMeta = $pdo->query("SELECT page_id as id, page_name as name, 'meta' as type FROM meta_app_configs WHERE status = 'active' ORDER BY page_name");
while ($row = $stmtMeta->fetch(PDO::FETCH_ASSOC)) {
    $pages[] = $row;
}
$stmtZalo = $pdo->query("SELECT oa_id as id, name, 'zalo' as type FROM zalo_oa_configs WHERE status = 'active' ORDER BY name");
while ($row = $stmtZalo->fetch(PDO::FETCH_ASSOC)) {
    $pages[] = $row;
}
$results['available_pages'] = $pages;

// 2. Test list_conversations with a sample page_id if exists
if (!empty($pages)) {
    $testPage = $pages[0];
    $pageFilter = $testPage['type'] . '_' . $testPage['id'];
    $propertyId = 'default'; // Adjust if needed

    $where = ["c.property_id = ?"];
    $params = [$propertyId];

    if (strpos($pageFilter, 'meta_') === 0) {
        $pageId = str_replace('meta_', '', $pageFilter);
        $where[] = "EXISTS (SELECT 1 FROM meta_subscribers ms2 WHERE c.visitor_id = CONCAT('meta_', ms2.psid) AND ms2.page_id = ?)";
        $params[] = $pageId;
    } elseif (strpos($pageFilter, 'zalo_') === 0) {
        $oaId = str_replace('zalo_', '', $pageFilter);
        $where[] = "EXISTS (SELECT 1 FROM zalo_subscribers zs2 WHERE c.visitor_id = CONCAT('zalo_', zs2.zalo_user_id) AND zs2.oa_id = ?)";
        $params[] = $oaId;
    }

    $whereSql = "WHERE " . implode(" AND ", $where);
    $sql = "SELECT COUNT(*) FROM ai_conversations c $whereSql";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $results['test_filter'] = [
        'page_filter' => $pageFilter,
        'count' => $stmt->fetchColumn()
    ];
}

echo json_encode($results, JSON_PRETTY_PRINT);
?>