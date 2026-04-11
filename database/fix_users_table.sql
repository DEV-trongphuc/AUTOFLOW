-- Fix & Upgrade Users Table for Google Auth Integration
-- Use this if your table already has legacy columns like 'full_name' or 'username'

ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS picture TEXT,
    ADD COLUMN IF NOT EXISTS status ENUM('pending', 'approved') DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS google_id VARCHAR(100) UNIQUE,
    ADD COLUMN IF NOT EXISTS last_login DATETIME,
    MODIFY COLUMN role ENUM('admin', 'user') DEFAULT 'user';

-- Sync legacy 'full_name' to new 'name' if it exists
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'full_name') > 0,
    'UPDATE users SET name = full_name WHERE name IS NULL OR name = ""',
    'SELECT 1'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ensure email column is unique
ALTER TABLE users ADD UNIQUE INDEX IF NOT EXISTS (email);

-- Insert/Update Root Admins
INSERT INTO users (email, name, role, status) 
VALUES 
('dom.marketing.vn@gmail.com', 'Admin Dom', 'admin', 'approved'),
('marketing@ideas.edu.vn', 'Admin Marketing', 'admin', 'approved')
ON DUPLICATE KEY UPDATE role='admin', status='approved';
