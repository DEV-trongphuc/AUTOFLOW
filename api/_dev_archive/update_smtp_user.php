<?php
// update_smtp_user.php
// Updates the SMTP User to the correct Brevo login ID

// Adjust path based on where the script is run
if (file_exists('api/db_connect.php')) {
    require_once 'api/db_connect.php';
} else if (file_exists('../api/db_connect.php')) {
    require_once '../api/db_connect.php';
} else if (file_exists('db_connect.php')) {
    require_once 'db_connect.php';
} else {
    die("Error: Could not find db_connect.php");
}

try {
    $newUser = '9ec212001@smtp-brevo.com';

    // Check if smtp_user exists
    $stmt = $pdo->prepare("SELECT value FROM system_settings WHERE workspace_id = 0 AND `key` = 'smtp_user'");
    $stmt->execute();
    $current = $stmt->fetchColumn();

    if ($current === false) {
        $stmt = $pdo->prepare("INSERT INTO system_settings (`workspace_id`, `key`, `value`) VALUES (0, 'smtp_user', ?)");
    } else {
        $stmt = $pdo->prepare("UPDATE system_settings SET `value` = ? WHERE workspace_id = 0 AND `key` = 'smtp_user'");
    }

    $stmt->execute([$newUser]);
    echo "Successfully updated SMTP User to: $newUser\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
