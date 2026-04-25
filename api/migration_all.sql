-- ==============================================================================
-- AUTOMATION FLOW - CUMULATIVE SQL MIGRATIONS
-- ==============================================================================
-- Bạn chỉ cần copy toàn bộ nội dung file này và chạy trong phpMyAdmin/HeidiSQL 
-- để áp dụng toàn bộ các tối ưu hóa cấu trúc mới nhất đã phân tích.

-- ------------------------------------------------------------------------------
-- 1. Tối ưu hóa Truy Vấn API Tracking (web_sessions)
-- Cũ là: (property_id, last_active_at, visitor_id) -> Gây quét toàn bộ bảng do last_active_at là range (>)
-- Mới là: (property_id, visitor_id, last_active_at) -> Truy vấn O(1) vị trí chính xác session.
-- ------------------------------------------------------------------------------
ALTER TABLE \web_sessions\ 
DROP INDEX \idx_live_traffic\, 
ADD INDEX \idx_live_traffic\ (\property_id\, \isitor_id\, \last_active_at\);

-- ------------------------------------------------------------------------------
-- 2. Tối ưu hóa Trích xuất JSON (ai_training_docs)
-- Loại bỏ quét toàn bảng khi tìm kiếm batch_id trong JSON
-- ------------------------------------------------------------------------------
ALTER TABLE \i_training_docs\
ADD COLUMN \atch_id_virtual\ VARCHAR(100) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.batch_id'))) VIRTUAL AFTER \metadata\,
ADD INDEX \idx_batch_id_virtual\ (\atch_id_virtual\);

-- ------------------------------------------------------------------------------
-- 3. Phân mảnh Bảng Log (Partitioning) - OPTIONAL NHƯNG KHUYẾN CÁO
-- Tối ưu hóa cron_cleanup chạy lệnh ALTER TABLE DROP PARTITION (tốc độ tức thời) 
-- thay vì DELETE FROM ... LIMIT (Gây lock table và phình to file LOG của InnoDB)
--
-- LƯU Ý QUAN TRỌNG: Để tạo Partition theo created_at, BẮT BUỘC phải thêm created_at vào Khóa Chính (Primary Key)
-- ------------------------------------------------------------------------------

-- Phân mảnh bảng web_events
ALTER TABLE \web_events\ DROP PRIMARY KEY, ADD PRIMARY KEY (\id\, \created_at\);

ALTER TABLE \web_events\ 
PARTITION BY RANGE (TO_DAYS(created_at)) (
    PARTITION p2026_04_25 VALUES LESS THAN (TO_DAYS('2026-04-26')),
    PARTITION p2026_04_26 VALUES LESS THAN (TO_DAYS('2026-04-27')),
    PARTITION p2026_04_27 VALUES LESS THAN (TO_DAYS('2026-04-28')),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Phân mảnh bảng system_audit_logs
ALTER TABLE \system_audit_logs\ DROP PRIMARY KEY, ADD PRIMARY KEY (\id\, \created_at\);

ALTER TABLE \system_audit_logs\ 
PARTITION BY RANGE (TO_DAYS(created_at)) (
    PARTITION p_old VALUES LESS THAN (TO_DAYS('2026-04-01')),
    PARTITION p2026_04_01 VALUES LESS THAN (TO_DAYS('2026-04-02')),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Phân mảnh bảng raw_event_buffer
ALTER TABLE \aw_event_buffer\ DROP PRIMARY KEY, ADD PRIMARY KEY (\id\, \created_at\);

ALTER TABLE \aw_event_buffer\ 
PARTITION BY RANGE (TO_DAYS(created_at)) (
    PARTITION p_old VALUES LESS THAN (TO_DAYS('2026-04-01')),
    PARTITION p2026_04_01 VALUES LESS THAN (TO_DAYS('2026-04-02')),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
