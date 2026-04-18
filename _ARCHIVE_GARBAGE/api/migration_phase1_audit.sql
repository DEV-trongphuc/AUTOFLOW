-- Migration Phase 1 Audit: Fix Data Types & Missing PKs

-- 1. Thêm Primary Key cho bảng geoip_blocks để tránh full-table scan
ALTER TABLE `geoip_blocks`
  ADD PRIMARY KEY (`ip_from`, `ip_to`);

-- 2. Gỡ bỏ DEFAULT '' khỏi các cột kiểu TEXT và MEDIUMTEXT tại bảng ai_chatbot_scenarios
-- (Tuân thủ MySQL Strict Mode, tránh lỗi Error 1101)
ALTER TABLE `ai_chatbot_scenarios`
  MODIFY `trigger_keywords` text NOT NULL,
  MODIFY `reply_text` mediumtext NOT NULL;

-- 3. Đồng bộ lại Charset & Collation về đúng chuẩn utf8mb4_unicode_ci
ALTER TABLE `ai_org_access_tokens` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `ai_org_refresh_tokens` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `ai_pdf_chunk_results` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `flow_snapshots` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
