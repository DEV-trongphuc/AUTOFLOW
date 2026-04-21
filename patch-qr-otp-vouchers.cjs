const mysql = require('mysql2/promise');
require('dotenv').config();

async function patch() {
    console.log('Connecting to database...');
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'mailflow_pro'
    });

    try {
        console.log('--- 1. CREATING OTP TABLES ---');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS otp_profiles (
                id VARCHAR(36) PRIMARY KEY,
                workspace_id VARCHAR(36) NOT NULL,
                name VARCHAR(255) NOT NULL,
                token_length INT DEFAULT 6,
                token_type ENUM('numeric', 'alpha', 'alphanumeric') DEFAULT 'numeric',
                ttl_minutes INT DEFAULT 5,
                email_template_id VARCHAR(36) DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('Created otp_profiles table.');

        await conn.query(`
            CREATE TABLE IF NOT EXISTS otp_codes (
                id VARCHAR(36) PRIMARY KEY,
                profile_id VARCHAR(36) NOT NULL,
                receiver_email VARCHAR(255) NOT NULL,
                code_hash VARCHAR(255) NOT NULL,
                status ENUM('pending', 'verified', 'expired') DEFAULT 'pending',
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                verified_at DATETIME DEFAULT NULL,
                INDEX idx_profile_email (profile_id, receiver_email),
                INDEX idx_expires (expires_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('Created otp_codes table.');

        console.log('--- 2. CREATING TRACKING / SHORT LINKS TABLES ---');
        await conn.query(`
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
        `);
        console.log('Created short_links table.');

        await conn.query(`
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
        `);
        console.log('Created link_clicks table.');

        console.log('--- 3. UPDATING VOUCHERS TABLES ---');
        try {
            await conn.query(`
                ALTER TABLE voucher_campaigns 
                ADD COLUMN is_claimable TINYINT(1) DEFAULT 0,
                ADD COLUMN claim_approval_required TINYINT(1) DEFAULT 0,
                ADD COLUMN claim_approval_type VARCHAR(20) DEFAULT 'auto',
                ADD COLUMN claim_email_template_id VARCHAR(36) DEFAULT NULL,
                ADD COLUMN flow_trigger_id VARCHAR(36) DEFAULT NULL
            `);
            console.log('Altered vouchers table successfully.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('Vouchers table already up to date.');
            } else {
                throw e;
            }
        }

        await conn.query(`
            CREATE TABLE IF NOT EXISTS voucher_claims (
                id VARCHAR(36) PRIMARY KEY,
                voucher_id VARCHAR(36) NOT NULL,
                subscriber_id VARCHAR(36) DEFAULT NULL,
                email VARCHAR(255) NOT NULL,
                name VARCHAR(255) DEFAULT NULL,
                phone VARCHAR(50) DEFAULT NULL,
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                assigned_code_id VARCHAR(36) DEFAULT NULL,
                claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                resolved_at DATETIME DEFAULT NULL,
                INDEX idx_voucher_email (voucher_id, email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('Created voucher_claims table.');

        console.log('\\nAll patches applied successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await conn.end();
        process.exit();
    }
}

patch();
