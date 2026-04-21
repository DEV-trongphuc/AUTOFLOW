<?php
require_once 'api/config.php';

echo "Connecting to database...\\n";
global $pdo;

try {
    echo "--- 1. CREATING OTP TABLES ---\\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS otp_profiles (
            id VARCHAR(36) PRIMARY KEY,
            workspace_id VARCHAR(36) NOT NULL,
            name VARCHAR(255) NOT NULL,
            token_length INT DEFAULT 6,
            token_type VARCHAR(50) DEFAULT 'numeric',
            ttl_minutes INT DEFAULT 5,
            email_template_id VARCHAR(36) DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "Created otp_profiles table.\\n";

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS otp_codes (
            id VARCHAR(36) PRIMARY KEY,
            profile_id VARCHAR(36) NOT NULL,
            receiver_email VARCHAR(255) NOT NULL,
            code_hash VARCHAR(255) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            verified_at DATETIME DEFAULT NULL,
            INDEX idx_profile_email (profile_id, receiver_email),
            INDEX idx_expires (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "Created otp_codes table.\\n";

    echo "--- 2. CREATING TRACKING / SHORT LINKS TABLES ---\\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS short_links (
            id VARCHAR(36) PRIMARY KEY,
            workspace_id VARCHAR(36) NOT NULL,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(100) UNIQUE NOT NULL,
            target_url TEXT DEFAULT NULL,
            is_survey_checkin TINYINT(1) DEFAULT 0,
            survey_id VARCHAR(36) DEFAULT NULL,
            qr_config_json TEXT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_slug (slug)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "Created short_links table.\\n";

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS link_clicks (
            id VARCHAR(36) PRIMARY KEY,
            short_link_id VARCHAR(36) NOT NULL,
            ip_hash VARCHAR(100) DEFAULT NULL,
            user_agent TEXT DEFAULT NULL,
            device_type VARCHAR(50) DEFAULT NULL,
            os VARCHAR(50) DEFAULT NULL,
            country VARCHAR(50) DEFAULT NULL,
            city VARCHAR(100) DEFAULT NULL,
            clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_link_time (short_link_id, clicked_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "Created link_clicks table.\\n";

    echo "--- 3. UPDATING VOUCHERS TABLES ---\\n";
    try {
        $pdo->exec("
            ALTER TABLE vouchers 
            ADD COLUMN claim_enabled TINYINT(1) DEFAULT 0,
            ADD COLUMN claim_limit_per_user INT DEFAULT 1,
            ADD COLUMN claim_approval_type VARCHAR(20) DEFAULT 'auto',
            ADD COLUMN claim_email_template_id VARCHAR(36) DEFAULT NULL,
            ADD COLUMN flow_trigger_id VARCHAR(36) DEFAULT NULL
        ");
        echo "Altered vouchers table successfully.\\n";
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
            echo "Vouchers table already up to date.\\n";
        } else {
            echo "Warning on Vouchers table: " . $e->getMessage() . "\\n";
        }
    }

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS voucher_claims (
            id VARCHAR(36) PRIMARY KEY,
            voucher_id VARCHAR(36) NOT NULL,
            subscriber_id VARCHAR(36) DEFAULT NULL,
            email VARCHAR(255) NOT NULL,
            name VARCHAR(255) DEFAULT NULL,
            phone VARCHAR(50) DEFAULT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            assigned_code_id VARCHAR(36) DEFAULT NULL,
            claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            resolved_at DATETIME DEFAULT NULL,
            INDEX idx_voucher_email (voucher_id, email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "Created voucher_claims table.\\n";

    echo "\\nAll patches applied successfully!\\n";
} catch (Exception $err) {
    echo "Migration failed: " . $err->getMessage() . "\\n";
}
