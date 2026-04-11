<?php
// migrate_turnio.php
require_once 'api/db_connect.php';

// 1. Create Tenant
$tenantName = 'Turnio Dev Team';
$stmt = $pdo->prepare("SELECT id FROM tenants WHERE name = ?");
$stmt->execute([$tenantName]);
$tenantId = $stmt->fetchColumn();

if (!$tenantId) {
    $stmt = $pdo->prepare("INSERT INTO tenants (name, created_at) VALUES (?, NOW())");
    $stmt->execute([$tenantName]);
    $tenantId = $pdo->lastInsertId();
    echo "Created Tenant: $tenantName (ID: $tenantId)\n";
} else {
    echo "Found Tenant: $tenantName (ID: $tenantId)\n";
}

// 2. Create User
$email = 'turniodev@gmail.com';
$password = 'Turnio@3105';
$hashedPassword = password_hash($password, PASSWORD_BCRYPT);
$role = 'admin';

$stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
$stmt->execute([$email]);
$userId = $stmt->fetchColumn();

if (!$userId) {
    $userId = bin2hex(random_bytes(16));
    $stmt = $pdo->prepare("INSERT INTO users (id, username, tenant_id, email, password, role, first_name, last_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())");
    $stmt->execute([$userId, $email, $tenantId, $email, $hashedPassword, $role, 'Turnio', 'Dev']);
    echo "Created User: $email (ID: $userId)\n";
} else {
    // Valid logic implies we might want to reset password or tenant if requested, but for now just link
    $stmt = $pdo->prepare("UPDATE users SET tenant_id = ?, password = ?, role = ? WHERE id = ?");
    $stmt->execute([$tenantId, $hashedPassword, $role, $userId]);
    echo "Updated User: $email linked to Tenant ID: $tenantId\n";
}

// 3. Data Migration (Link all headerless data to this tenant)
// List of tables that have tenant_id
$tables = [
    'subscribers',
    'flows',
    'campaigns',
    'lists',
    'tags',
    'segments',
    'forms',
    'zalo_oa_configs',
    'zalo_subscribers',
    'zalo_broadcasts',
    'subscriber_flow_states',
    'subscriber_activity',
    'mail_delivery_logs',
    'system_settings' // Maybe? Usually system settings are global, but let's check if we added tenant_id
];

echo "Migrating data...\n";

foreach ($tables as $table) {
    try {
        // Check if table has tenant_id column just in case
        $stmt = $pdo->query("SHOW COLUMNS FROM `$table` LIKE 'tenant_id'");
        if ($stmt->fetch()) {
            // Update NULL or 0 tenant_ids
            $sql = "UPDATE `$table` SET tenant_id = ? WHERE tenant_id IS NULL OR tenant_id = 0";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$tenantId]);
            $count = $stmt->rowCount();
            echo " - Updated $count rows in '$table'\n";
        }
    } catch (PDOException $e) {
        echo " - Skipped '$table' (Error or no column): " . $e->getMessage() . "\n";
    }
}

echo "Migration Complete.\n";
