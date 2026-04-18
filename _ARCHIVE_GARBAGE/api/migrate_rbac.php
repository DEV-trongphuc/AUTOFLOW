<?php
// api/migrate_rbac.php
require_once 'db_connect.php';

try {
    // 1. Create workspaces table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `workspaces` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `name` varchar(255) NOT NULL,
        `description` text,
        `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
        `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 2. Create roles table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `roles` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `name` varchar(100) NOT NULL,
        `description` text,
        PRIMARY KEY (`id`),
        UNIQUE KEY `name_unique` (`name`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 3. Create permissions table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `permissions` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `slug` varchar(100) NOT NULL,
        `name` varchar(100) NOT NULL,
        `category` varchar(100) NOT NULL,
        PRIMARY KEY (`id`),
        UNIQUE KEY `slug_unique` (`slug`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 4. Create role_permissions table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `role_permissions` (
        `role_id` int(11) NOT NULL,
        `permission_slug` varchar(100) NOT NULL,
        PRIMARY KEY (`role_id`, `permission_slug`),
        FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`permission_slug`) REFERENCES `permissions`(`slug`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 5. Create workspace_users table with VARCHAR user_id for SSO support
    $pdo->exec("CREATE TABLE IF NOT EXISTS `workspace_users` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `workspace_id` int(11) NOT NULL,
        `user_id` varchar(255) NOT NULL,
        `role_id` int(11) NOT NULL,
        `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        UNIQUE KEY `ws_user_unique` (`workspace_id`, `user_id`),
        FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    try {
        // Fix for previously created INT(11) user_id from older migrations
        $pdo->exec("ALTER TABLE `workspace_users` MODIFY `user_id` VARCHAR(255) NOT NULL;");
    } catch (Exception $e) {}

    // Add necessary workspace_id columns to existing tables
    $tablesToAlter = ['campaigns', 'flows', 'subscribers', 'templates', 'forms', 'integrations', 'lists', 'tags', 'approval_requests'];
    
    foreach ($tablesToAlter as $table) {
        try {
            // Check if table exists
            $stmt = $pdo->prepare("SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?");
            $stmt->execute([$table]);
            if ($stmt->fetch()) {
                // Check if column exists
                $colStmt = $pdo->prepare("SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = 'workspace_id'");
                $colStmt->execute([$table]);
                if (!$colStmt->fetch()) {
                    $pdo->exec("ALTER TABLE `$table` ADD COLUMN `workspace_id` INT(11) DEFAULT 1;");
                    echo "-> Added workspace_id to $table.\n";
                } else {
                    echo "-> workspace_id already exists in $table.\n";
                }
            } else {
                echo "-> Table $table does not exist in DB, skipping safely.\n";
            }
        } catch(Exception $e) {
            echo "-> Error checking/altering $table: " . $e->getMessage() . "\n";
        }
    }

    // Insert Default Workspace
    $stmt = $pdo->prepare("SELECT id FROM workspaces WHERE id = 1");
    $stmt->execute();
    if (!$stmt->fetch()) {
        $pdo->exec("INSERT INTO `workspaces` (`id`, `name`, `description`) VALUES (1, 'Mặc định (Root)', 'Môi trường làm việc chính của hệ thống');");
    }

    // Insert Roles
    $roles = [
        [1, 'Admin', 'Quản trị viên toàn quyền'],
        [2, 'Marketer', 'Quản lý chiến dịch, khách hàng và báo cáo'],
        [3, 'Viewer', 'Chỉ xem báo cáo, không được phép chỉnh sửa']
    ];
    $stmtRole = $pdo->prepare("INSERT IGNORE INTO `roles` (`id`, `name`, `description`) VALUES (?, ?, ?)");
    foreach ($roles as $r) {
        $stmtRole->execute($r);
    }

    // Insert Permissions
    $permissions = [
        ['slug' => 'manage_users', 'name' => 'Quản lý Nhân sự', 'category' => 'system'],
        ['slug' => 'manage_roles', 'name' => 'Tùy chỉnh chức vụ', 'category' => 'system'],
        ['slug' => 'edit_campaigns', 'name' => 'Chỉnh sửa Chiến dịch & Kịch bản', 'category' => 'marketing'],
        ['slug' => 'view_campaigns', 'name' => 'Xem Chiến dịch', 'category' => 'marketing'],
        ['slug' => 'manage_subscribers', 'name' => 'Quản lý Khách hàng', 'category' => 'marketing'],
        ['slug' => 'view_reports', 'name' => 'Xem Báo cáo', 'category' => 'reporting']
    ];
    $stmtPerm = $pdo->prepare("INSERT IGNORE INTO `permissions` (`slug`, `name`, `category`) VALUES (?, ?, ?)");
    foreach ($permissions as $p) {
        $stmtPerm->execute([$p['slug'], $p['name'], $p['category']]);
    }

    // Assign Role Permissions
    $stmtRP = $pdo->prepare("INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_slug`) VALUES (?, ?)");
    foreach ($permissions as $p) {
        $stmtRP->execute([1, $p['slug']]); // Admin
    }
    // Marketer gets marketing & reporting
    $stmtRP->execute([2, 'edit_campaigns']);
    $stmtRP->execute([2, 'view_campaigns']);
    $stmtRP->execute([2, 'manage_subscribers']);
    $stmtRP->execute([2, 'view_reports']);
    // Viewer gets reporting & view
    $stmtRP->execute([3, 'view_campaigns']);
    $stmtRP->execute([3, 'view_reports']);

    // Configure Target Super Admin User
    $adminEmail = 'dom.marketing.vn@gmail.com';
    $stmt = $pdo->prepare("SELECT id FROM users WHERE TRIM(LOWER(email)) = LOWER(?) LIKE ? LIMIT 1");
    // We use LIKE as a fallback
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email LIKE '%dom.marketing%gmail.com%' LIMIT 1");
    $stmt->execute();
    $adminId = $stmt->fetchColumn();

    if ($adminId === false || $adminId === null) {
        try {
            // Create the admin user if they don't exist
            // Assuming username is required and unique, we give it a random username.
            $stmtIn = $pdo->prepare("INSERT INTO users (id, username, email, name, role, status) VALUES (?, ?, ?, 'Root Admin', 'super_admin', 'approved')");
            $newId = 'admin-' . uniqid();
            $stmtIn->execute([$newId, $newId, $adminEmail]);
            $adminId = $newId;
            echo "Created root user $adminEmail with ID $adminId.\n";
        } catch (Exception $e) {
            echo "Non-critical warning: Failed to auto-create root user: " . $e->getMessage() . "\n";
        }
    }

    if ($adminId) {
        try {
            // Safe string binding for ID to handle UUIDs / String IDs properly (No (int) casting)
            $stmtUp = $pdo->prepare("UPDATE users SET role = 'super_admin' WHERE id = ?");
            $stmtUp->execute([$adminId]);
            echo "Ensured user $adminEmail is super_admin.\n";
            
            // Tie to Workspace 1 as Admin
            $stmtWU = $pdo->prepare("INSERT IGNORE INTO workspace_users (workspace_id, user_id, role_id) VALUES (1, ?, 1)");
            $stmtWU->execute([$adminId]);
            echo "Assigned user $adminEmail to Workspace 1 (Root) as role Admin.\n";

        } catch (Exception $e) {
            echo "Error updating user role: " . $e->getMessage() . "\n";
        }
    }

    echo "Migration completed successfully without errors!\n";

} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
