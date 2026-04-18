<?php
// api/fix_campaign_types.php
require_once 'db_connect.php';

try {
    echo "Updating campaigns table schema...\n";
    $sql = "ALTER TABLE `campaigns` MODIFY `type` ENUM('regular', 'email', 'zalo_zns', 'ab_testing', 'autoresponder') DEFAULT 'email'";
    $pdo->exec($sql);
    echo "SUCCESS: Campaigns table updated.\n";

    // Also update any existing campaigns with empty type to 'email' or 'zalo_zns' based on name/config
    echo "Fixing existing empty types...\n";
    $pdo->exec("UPDATE campaigns SET type = 'zalo_zns' WHERE type = '' AND (name LIKE '%zns%' OR config LIKE '%oa_config_id%')");
    $pdo->exec("UPDATE campaigns SET type = 'email' WHERE type = '' OR type = 'regular'");
    echo "SUCCESS: Existing campaigns updated.\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
