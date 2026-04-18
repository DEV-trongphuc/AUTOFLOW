<?php
// restore_settings.php
// Restores the system settings to the provided known good configuration

// Adjust path based on where the script is run
if (file_exists('api/db_connect.php')) {
    require_once 'api/db_connect.php';
} else if (file_exists('../api/db_connect.php')) {
    require_once '../api/db_connect.php';
} else if (file_exists('db_connect.php')) {
    require_once 'db_connect.php';
} else {
    // Try absolute path if known, or just error out but maybe json encode it?
    die(json_encode(['error' => "Could not find db_connect.php"]));
}

try {
    $settings = [
        ['key' => 'imap_enabled', 'value' => '1'],
        ['key' => 'imap_host', 'value' => 'imap.gmail.com'],
        ['key' => 'imap_pass', 'value' => 'Turnio@3105'],
        ['key' => 'imap_port', 'value' => '993'],
        ['key' => 'imap_user', 'value' => 'turniodev@gmail.com'],
        ['key' => 'internal_qa_emails', 'value' => ''],
        ['key' => 'smtp_enabled', 'value' => '1'],
        ['key' => 'smtp_encryption', 'value' => 'tls'],
        ['key' => 'smtp_host', 'value' => 'smtp-relay.brevo.com'],
        // Note: Using the provided API key
        ['key' => 'smtp_pass', 'value' => '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'],
        ['key' => 'smtp_port', 'value' => '587'],
        ['key' => 'smtp_user', 'value' => 'turniodev@gmail.com']
    ];

    $pdo->beginTransaction();

    foreach ($settings as $setting) {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM system_settings WHERE `key` = ?");
        $stmt->execute([$setting['key']]);
        $exists = $stmt->fetchColumn();

        if ($exists) {
            $update = $pdo->prepare("UPDATE system_settings SET `value` = ? WHERE `key` = ?");
            $update->execute([$setting['value'], $setting['key']]);
        } else {
            $insert = $pdo->prepare("INSERT INTO system_settings (`key`, `value`, `updated_at`) VALUES (?, ?, NOW())");
            $insert->execute([$setting['key'], $setting['value']]);
        }
    }

    $pdo->commit();
    echo "Settings restored successfully.\n";

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "Error: " . $e->getMessage() . "\n";
}
