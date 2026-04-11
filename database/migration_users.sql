-- Auth & Users Migration for Autoflow
-- File: database/migration_users.sql

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    picture TEXT,
    role ENUM('admin', 'user') DEFAULT 'user',
    status ENUM('pending', 'approved') DEFAULT 'pending',
    google_id VARCHAR(100) UNIQUE,
    last_login DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed initial root admins
INSERT INTO users (email, name, role, status) 
VALUES 
('dom.marketing.vn@gmail.com', 'Admin Dom', 'admin', 'approved'),
('marketing@ideas.edu.vn', 'Admin Marketing', 'admin', 'approved')
ON DUPLICATE KEY UPDATE role='admin', status='approved';

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS user_access_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100),
    device TEXT,
    ip_address VARCHAR(45),
    location TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
