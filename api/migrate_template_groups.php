<?php
require_once 'db_connect.php';

try {
    echo "Starting migration for template grouping...\n";

    // 1. Create template_groups table
    $sqlGroups = "CREATE TABLE IF NOT EXISTS template_groups (
        id CHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    $pdo->exec($sqlGroups);
    echo "Table `template_groups` ensured.\n";

    // 2. Add group_id to templates table
    $stmt = $pdo->query("SHOW COLUMNS FROM templates LIKE 'group_id'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE templates ADD COLUMN group_id CHAR(36) DEFAULT NULL AFTER category");
        echo "Column `group_id` added to `templates` table.\n";
    } else {
        echo "Column `group_id` already exists in `templates` table.\n";
    }

    // 3. Optional: Create some default groups based on current categories
    $stmtCats = $pdo->query("SELECT DISTINCT category FROM templates WHERE category IS NOT NULL AND category != ''");
    $categories = $stmtCats->fetchAll(PDO::FETCH_COLUMN);

    foreach ($categories as $cat) {
        $groupName = ucfirst($cat);
        // Map common categories to Vietnamese
        $labels = [
            'welcome' => 'Chào mừng',
            'promotional' => 'Khuyến mãi',
            'newsletter' => 'Bản tin',
            'transactional' => 'Giao dịch',
            'event' => 'Sự kiện'
        ];
        if (isset($labels[$cat])) {
            $groupName = $labels[$cat];
        }

        // Check if group already exists
        $stmtCheck = $pdo->prepare("SELECT id FROM template_groups WHERE name = ?");
        $stmtCheck->execute([$groupName]);
        $groupId = $stmtCheck->fetchColumn();

        if (!$groupId) {
            $groupId = uniqid();
            $stmtInsert = $pdo->prepare("INSERT INTO template_groups (id, name) VALUES (?, ?)");
            $stmtInsert->execute([$groupId, $groupName]);
            echo "Created default group: $groupName\n";
        }

        // Assign templates of this category to the new group
        $stmtUpdate = $pdo->prepare("UPDATE templates SET group_id = ? WHERE category = ? AND group_id IS NULL");
        $stmtUpdate->execute([$groupId, $cat]);
    }

    echo "Migration completed successfully.\n";
} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
?>