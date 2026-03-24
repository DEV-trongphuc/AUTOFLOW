<?php
require_once 'db_connect.php';
header('Content-Type: application/json');

/**
 * MIGRATION: Fix empty titles in web_page_views
 * 1. Fill empty titles from existing records with the same URL hash.
 * 2. Generate titles from URL for remaining empty records.
 */

try {
    $pdo->beginTransaction();

    // 1. Fill empty titles from other records with the same url_hash
    $sqlFillFromDb = "
        UPDATE web_page_views pv1
        JOIN (
            SELECT url_hash, title 
            FROM web_page_views 
            WHERE title IS NOT NULL AND title != '' 
            GROUP BY url_hash
        ) pv2 ON pv1.url_hash = pv2.url_hash
        SET pv1.title = pv2.title
        WHERE pv1.title IS NULL OR pv1.title = ''
    ";
    $affected1 = $pdo->exec($sqlFillFromDb);

    // 2. Generate titles from URL for those still empty
    $stmtEmpty = $pdo->query("SELECT id, url FROM web_page_views WHERE title IS NULL OR title = ''");
    $emptyRows = $stmtEmpty->fetchAll(PDO::FETCH_ASSOC);

    $affected2 = 0;
    $stmtUpdate = $pdo->prepare("UPDATE web_page_views SET title = ? WHERE id = ?");

    foreach ($emptyRows as $row) {
        $url = $row['url'];
        $parsed = parse_url($url);
        $path = $parsed['path'] ?? '';

        if (!$path || $path === '/') {
            $title = 'Home';
        } else {
            // Take the last segment of the path
            $segments = explode('/', trim($path, '/'));
            $lastSegment = end($segments);

            // Clean up: remove extensions, replace hyphens/underscores with spaces, capitalize
            $title = preg_replace('/\.(html|php|aspx|jsp)$/i', '', $lastSegment);
            $title = str_replace(['-', '_'], ' ', $title);
            $title = ucwords(trim($title));

            if (!$title)
                $title = 'Untitled Page';
        }

        if ($stmtUpdate->execute([$title, $row['id']])) {
            $affected2++;
        }
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Migration completed',
        'details' => [
            'filled_from_history' => $affected1,
            'generated_from_url' => $affected2
        ]
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction())
        $pdo->rollBack();
    echo json_encode([
        'success' => false,
        'message' => 'Migration failed: ' . $e->getMessage()
    ]);
}
?>