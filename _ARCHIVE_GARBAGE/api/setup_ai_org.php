<?php
header('Content-Type: text/plain; charset=utf-8');
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/db_connect.php';

// Check PDO
if (!isset($pdo)) {
    die("Error: Database connection variable \$pdo not found in db_connect.php");
}

try {
    echo "Starting AI Org Users Setup (PDO)...\n";

    // Create table ai_org_users
    // Permissions JSON structure example: {"modes": ["chat", "code", "image"], "access": "all"}
    $sql = "CREATE TABLE IF NOT EXISTS `ai_org_users` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `user_id` varchar(100) DEFAULT NULL COMMENT 'Link to main users table if applicable',
        `email` varchar(191) NOT NULL,
        `password_hash` varchar(255) DEFAULT NULL,
        `full_name` varchar(255) DEFAULT NULL,
        `role` enum('admin', 'assistant', 'user') DEFAULT 'user',
        `status` enum('active', 'banned', 'warning') DEFAULT 'active',
        `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`permissions`)),
        `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
        `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        `last_login` datetime DEFAULT NULL,
        PRIMARY KEY (`id`),
        UNIQUE KEY `email` (`email`),
        KEY `user_id` (`user_id`),
        KEY `role` (`role`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    $pdo->exec($sql);
    // Migration: ensure user_id is VARCHAR(100)
    $pdo->exec("ALTER TABLE `ai_org_users` MODIFY COLUMN `user_id` VARCHAR(100) DEFAULT NULL");
    echo "[OK] Table 'ai_org_users' checked/created successfully.\n";

    // Create default admin user if not exists
    $defaultAdminEmail = 'admin@example.com'; // Replace with actual default or leave as example
    $defaultAdminPass = 'admin123'; // Should be changed immediately

    // You might want to link this to an existing user from the 'users' table if possible
    // For now, we'll check if any admin exists
    $stmt = $pdo->query("SELECT COUNT(*) FROM ai_org_users WHERE role = 'admin'");
    if ($stmt->fetchColumn() == 0) {
        echo "Creating default admin user...\n";
        $passHash = password_hash($defaultAdminPass, PASSWORD_DEFAULT);
        $stmtInsert = $pdo->prepare("INSERT INTO ai_org_users (email, password_hash, full_name, role, status, permissions) VALUES (?, ?, ?, 'admin', 'active', ?)");
        $defaultPerms = json_encode(['modes' => ['chat', 'code', 'image'], 'access' => 'all']);
        $stmtInsert->execute([$defaultAdminEmail, $passHash, 'Default Admin', $defaultPerms]);
        echo "[OK] Default admin created (Email: $defaultAdminEmail, Pass: $defaultAdminPass)\n";
        echo "IMPORTANT: Please change this password immediately or delete this user after creating your real admin.\n";
    }

    echo "\nSetup completed! ai_org_users table is ready.";

} catch (PDOException $e) {
    http_response_code(500);
    echo "\n[ERROR] Database error: " . $e->getMessage();
} catch (Exception $e) {
    http_response_code(500);
    echo "\n[ERROR] Error: " . $e->getMessage();
}
?>