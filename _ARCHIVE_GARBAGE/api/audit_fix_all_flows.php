<?php
/**
 * COMPREHENSIVE FLOW DATA AUDIT & FIX
 * Rà soát và sửa tất cả các vấn đề về đồng bộ dữ liệu flow
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain; charset=utf-8');

require 'db_connect.php';

echo "=== BẮT ĐẦU RÀ SOÁT TOÀN BỘ HỆ THỐNG ===\n\n";

// ============================================
// BƯỚC 1: Kiểm tra tất cả các flow đang active
// ============================================
echo "BƯỚC 1: Lấy danh sách tất cả flows...\n";
$stmt = $pdo->query("SELECT id, name, status FROM flows WHERE status != 'archived' ORDER BY status DESC");
$flows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Tìm thấy " . count($flows) . " flows cần kiểm tra.\n\n";

$totalIssuesFound = 0;
$totalIssuesFixed = 0;

foreach ($flows as $flow) {
    echo "----------------------------------------\n";
    echo "Flow: {$flow['name']} (ID: {$flow['id']})\n";
    echo "Status: {$flow['status']}\n";

    $flowId = $flow['id'];

    // ============================================
    // BƯỚC 2: Kiểm tra mismatch giữa activity logs và flow states
    // ============================================
    echo "\n[Kiểm tra 1] Người có complete_flow log nhưng chưa được mark completed...\n";

    $stmt = $pdo->prepare("
        SELECT DISTINCT sa.subscriber_id, sfs.status as current_status
        FROM subscriber_activity sa
        LEFT JOIN subscriber_flow_states sfs ON sa.subscriber_id = sfs.subscriber_id AND sa.flow_id = sfs.flow_id
        WHERE sa.flow_id = ? AND sa.type = 'complete_flow'
        AND (sfs.status IS NULL OR sfs.status != 'completed')
    ");
    $stmt->execute([$flowId]);
    $mismatches = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!empty($mismatches)) {
        echo "  ⚠️ Tìm thấy " . count($mismatches) . " người bị sai lệch:\n";
        $totalIssuesFound += count($mismatches);

        foreach ($mismatches as $m) {
            echo "    - Subscriber: {$m['subscriber_id']} (Trạng thái hiện tại: " . ($m['current_status'] ?? 'NULL') . ")\n";

            // Fix: Cập nhật hoặc insert
            // Find potential real step_id from logs
            $stmtRef = $pdo->prepare("SELECT reference_id FROM subscriber_activity WHERE subscriber_id = ? AND flow_id = ? AND type = 'complete_flow' ORDER BY created_at DESC LIMIT 1");
            $stmtRef->execute([$m['subscriber_id'], $flowId]);
            $realStepId = $stmtRef->fetchColumn() ?: 'final';

            if ($m['current_status'] === null) {
                // Không có record trong state table -> INSERT
                $pdo->prepare("
                    INSERT INTO subscriber_flow_states (flow_id, subscriber_id, status, step_id, updated_at)
                    VALUES (?, ?, 'completed', ?, NOW())
                ")->execute([$flowId, $m['subscriber_id'], $realStepId]);
                echo "      ✅ INSERTED new completed record with step_id: $realStepId\n";
            } else {
                $updateSql = "UPDATE subscriber_flow_states SET status = 'completed', updated_at = NOW()";
                $params = [$flowId, $m['subscriber_id']];
                if ($realStepId && $realStepId !== 'final') {
                    $updateSql .= ", step_id = ?";
                    array_unshift($params, $realStepId);
                }

                // Có record nhưng status sai -> UPDATE
                $pdo->prepare($updateSql . " WHERE flow_id = ? AND subscriber_id = ?")
                    ->execute($params);
                echo "      ✅ UPDATED status to completed (step_id: " . ($realStepId ?: 'unchanged') . ")\n";
            }
            $totalIssuesFixed++;
        }
    } else {
        echo "  ✅ Không có vấn đề.\n";
    }

    // ============================================
    // BƯỚC 3: Kiểm tra người được mark completed nhưng không có complete_flow log
    // ============================================
    echo "\n[Kiểm tra 2] Người được mark completed nhưng KHÔNG có complete_flow log...\n";

    $stmt = $pdo->prepare("
        SELECT sfs.subscriber_id
        FROM subscriber_flow_states sfs
        LEFT JOIN subscriber_activity sa ON sfs.subscriber_id = sa.subscriber_id 
            AND sfs.flow_id = sa.flow_id 
            AND sa.type = 'complete_flow'
        WHERE sfs.flow_id = ? AND sfs.status = 'completed'
        AND sa.id IS NULL
    ");
    $stmt->execute([$flowId]);
    $falseCompleted = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (!empty($falseCompleted)) {
        echo "  ⚠️ Tìm thấy " . count($falseCompleted) . " người bị đánh dấu completed sai:\n";
        $totalIssuesFound += count($falseCompleted);

        foreach ($falseCompleted as $subId) {
            echo "    - Subscriber: $subId\n";

            // Kiểm tra xem họ có đang ở bước nào không
            $stmt = $pdo->prepare("SELECT step_id FROM subscriber_flow_states WHERE flow_id = ? AND subscriber_id = ?");
            $stmt->execute([$flowId, $subId]);
            $stepId = $stmt->fetchColumn();

            echo "      Current step_id: $stepId\n";
            echo "      ⚠️ CẢNH BÁO: Cần kiểm tra thủ công - có thể là dữ liệu cũ hoặc migration\n";
            // Không tự động fix vì có thể là dữ liệu hợp lệ từ migration
        }
    } else {
        echo "  ✅ Không có vấn đề.\n";
    }

    // ============================================
    // BƯỚC 4: Kiểm tra stuck users (waiting quá lâu)
    // ============================================
    echo "\n[Kiểm tra 3] Người dùng stuck (waiting > 7 ngày)...\n";

    $stmt = $pdo->prepare("
        SELECT subscriber_id, step_id, updated_at, DATEDIFF(NOW(), updated_at) as days_stuck
        FROM subscriber_flow_states
        WHERE flow_id = ? AND status = 'waiting'
        AND updated_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY updated_at ASC
        LIMIT 10
    ");
    $stmt->execute([$flowId]);
    $stuckUsers = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!empty($stuckUsers)) {
        echo "  ⚠️ Tìm thấy " . count($stuckUsers) . " người stuck (hiển thị 10 người đầu):\n";
        foreach ($stuckUsers as $u) {
            echo "    - Subscriber: {$u['subscriber_id']} | Step: {$u['step_id']} | Stuck: {$u['days_stuck']} ngày\n";
        }
        echo "  ℹ️ Đây có thể là wait step hợp lệ. Cần kiểm tra thủ công.\n";
    } else {
        echo "  ✅ Không có người stuck bất thường.\n";
    }

    // ============================================
    // BƯỚC 5: Tính toán lại stats cho flow này
    // ============================================
    echo "\n[Kiểm tra 4] Tính toán lại statistics...\n";

    $stmt = $pdo->prepare("
        SELECT 
            COUNT(DISTINCT subscriber_id) as enrolled,
            COUNT(DISTINCT CASE WHEN status = 'completed' THEN subscriber_id END) as completed
        FROM subscriber_flow_states 
        WHERE flow_id = ?
    ");
    $stmt->execute([$flowId]);
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);

    echo "  Enrolled: {$stats['enrolled']}\n";
    echo "  Completed: {$stats['completed']}\n";

    // Cập nhật vào bảng flows
    $pdo->prepare("UPDATE flows SET stat_enrolled = ?, stat_completed = ? WHERE id = ?")
        ->execute([$stats['enrolled'], $stats['completed'], $flowId]);
    echo "  ✅ Đã cập nhật stats vào bảng flows.\n";

    echo "\n";
}

// ============================================
// BƯỚC 6: Kiểm tra buffer tables
// ============================================
echo "\n========================================\n";
echo "BƯỚC 6: Kiểm tra buffer tables...\n";
echo "========================================\n";

$stmt = $pdo->query("SELECT COUNT(*) FROM activity_buffer WHERE processed = 0");
$activityBufferCount = $stmt->fetchColumn();
echo "Activity Buffer (chưa xử lý): $activityBufferCount records\n";

$stmt = $pdo->query("SELECT COUNT(*) FROM stats_update_buffer WHERE processed = 0");
$statsBufferCount = $stmt->fetchColumn();
echo "Stats Update Buffer (chưa xử lý): $statsBufferCount records\n";

if ($activityBufferCount > 0 || $statsBufferCount > 0) {
    echo "\n⚠️ CẢNH BÁO: Có dữ liệu chưa được xử lý trong buffer!\n";
    echo "Khuyến nghị: Chạy worker_tracking_aggregator.php để xử lý.\n";
}

// ============================================
// TÓM TẮT
// ============================================
echo "\n========================================\n";
echo "TÓM TẮT KẾT QUẢ RÀ SOÁT\n";
echo "========================================\n";
echo "Tổng số flows đã kiểm tra: " . count($flows) . "\n";
echo "Tổng số vấn đề tìm thấy: $totalIssuesFound\n";
echo "Tổng số vấn đề đã fix: $totalIssuesFixed\n";
echo "\n✅ HOÀN THÀNH RÀ SOÁT!\n";
