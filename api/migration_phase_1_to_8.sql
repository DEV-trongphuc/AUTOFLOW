-- ==============================================================================
-- DOMATION FULLSTACK - MIGRATION BỔ SUNG (PHASE 8 FINAL)
-- ==============================================================================
-- Lỗi #1452 xảy ra do trong bảng subscriber_lists hiện tại đang chứa các "Bóng ma"
-- (Orphan Records) - tức là có subscriber_id nhưng user đó thực tế đã bị xóa 
-- khỏi bảng subscribers từ lâu.
-- Câu lệnh dưới đây sẽ tự động lọc bỏ các bóng ma này khi insert lại.
-- ==============================================================================

-- Tạm tắt Foreign Key Checks để Truncate không bị cản trở
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Backup các cặp Unique
CREATE TABLE IF NOT EXISTS tmp_sl AS SELECT DISTINCT subscriber_id, list_id FROM subscriber_lists;

-- 2. Xóa bảng gốc
TRUNCATE TABLE subscriber_lists;

-- 3. Insert lại, nhưng CHỈ lấy những subscriber_id và list_id CÒN TỒN TẠI THẬT SỰ
INSERT IGNORE INTO subscriber_lists 
SELECT t.* 
FROM tmp_sl t
INNER JOIN subscribers s ON t.subscriber_id = s.id
INNER JOIN lists l ON t.list_id = l.id;

-- 4. Xóa bảng tạm
DROP TABLE tmp_sl;

-- Bật lại Foreign Key Checks
SET FOREIGN_KEY_CHECKS = 1;
