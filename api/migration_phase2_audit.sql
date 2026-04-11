-- Migration Phase 2 Audit: Core Security & Connectivity

-- 1. Thêm bảng lưu trữ giới hạn Rate Limit để chống Brute Force khi người dùng Login
CREATE TABLE IF NOT EXISTS `api_rate_limits` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ip_address` VARCHAR(45) NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `attempts` INT DEFAULT 1,
  `last_attempt_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `blocked_until` DATETIME DEFAULT NULL,
  
  -- Index để tối ưu việc tìm kiếm nhanh
  INDEX `idx_ip_action` (`ip_address`, `action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
