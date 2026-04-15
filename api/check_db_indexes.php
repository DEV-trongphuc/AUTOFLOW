<?php
require_once 'db_connect.php';

// Set up HTML output
echo "<!DOCTYPE html><html><head><title>Trình Phân Tích DB Indexes</title>";
echo "<style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 30px; background-color: #f8fafc; color: #334155; }
    h1 { color: #f59e0b; font-size: 24px; margin-bottom: 20px; text-align: center; }
    .card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-bottom: 24px; border: 1px solid #e2e8f0; }
    .table-title { font-size: 18px; font-weight: bold; color: #1e293b; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 15px; font-size: 14px; }
    th, td { border: 1px solid #e2e8f0; padding: 10px 15px; text-align: left; }
    th { background-color: #f1f5f9; color: #475569; font-weight: 600; }
    tr:hover { background-color: #f8fafc; }
    .warning { color: #ef4444; font-weight: bold; }
    .good { color: #10b981; font-weight: bold; }
    .suggestion { background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 10px 15px; margin-bottom: 10px; font-size: 14px; border-radius: 4px; }
    .metric { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: bold; }
    .metric-ok { background: #d1fae5; color: #065f46; }
    .metric-warn { background: #fee2e2; color: #991b1b; }
</style>";
echo "</head><body>";
echo "<h1>🔍 Báo Cáo Chuẩn Đoán Indexes Của Database</h1>";

try {
    $tablesQuery = $pdo->query("SHOW TABLES");
    $tables = $tablesQuery->fetchAll(PDO::FETCH_COLUMN);

    $totalSuggestions = 0;

    foreach ($tables as $table) {
        echo "<div class='card'>";
        
        // Fetch columns
        $colsQuery = $pdo->query("SHOW COLUMNS FROM `$table`");
        $columns = $colsQuery->fetchAll(PDO::FETCH_ASSOC);
        
        // Fetch indexes
        $idxQuery = $pdo->query("SHOW INDEX FROM `$table`");
        $indexes = $idxQuery->fetchAll(PDO::FETCH_ASSOC);
        
        // Group indexes
        $groupedIndexes = [];
        foreach ($indexes as $idx) {
            $groupedIndexes[$idx['Key_name']][] = $idx['Column_name'];
        }
        
        $tableStatus = empty($groupedIndexes) ? "<span class='metric metric-warn'>No Indexes!</span>" : "<span class='metric metric-ok'>OK</span>";
        echo "<div class='table-title'>Bảng: <code>" . htmlspecialchars($table) . "</code> " . $tableStatus . "</div>";
        
        echo "<table><tr><th width='30%'>Tên Index (Key)</th><th>Các cột (Columns)</th></tr>";
        if (empty($groupedIndexes)) {
            echo "<tr><td colspan='2' class='warning'>⚠ Bảng này chưa có bất kỳ Index nào, kể cả Primary Key!</td></tr>";
        } else {
            foreach ($groupedIndexes as $keyName => $cols) {
                $isPrimary = $keyName === 'PRIMARY' ? ' <span style="color:#f59e0b;font-size:12px;">(PK)</span>' : '';
                echo "<tr>";
                echo "<td><strong>" . htmlspecialchars($keyName) . "</strong>$isPrimary</td>";
                echo "<td><code>" . htmlspecialchars(implode('</code>, <code>', $cols)) . "</code></td>";
                echo "</tr>";
            }
        }
        echo "</table>";

        // Generate heuristics / suggestions
        $suggestions = [];
        foreach ($columns as $col) {
            $colName = $col['Field'];
            
            // Heuristic flags cols that often need index: Foreign keys (_id), status flags, timestamp grouping
            if (preg_match('/_id$/', $colName) || in_array($colName, ['email', 'status', 'created_at', 'type'])) {
                $isIndexedAsPrefix = false;
                
                foreach ($groupedIndexes as $cols) {
                    if ($cols[0] === $colName) { 
                        // It is the left-most prefix of some index, meaning where/join on this column exploits the index reliably
                        $isIndexedAsPrefix = true;
                        break;
                    }
                }
                
                if (!$isIndexedAsPrefix && $colName !== 'id') {
                    $reason = str_ends_with($colName, '_id') ? "Khóa ngoại (Foreign Key) thường dùng để JOIN" : "Trường dữ liệu thường dùng để lọc (WHERE/ORDER BY)";
                    $suggestions[] = "Cột <code>$colName</code> nên được cân nhắc tạo Index. <strong>Lý do:</strong> $reason.";
                }
            }
        }
        
        if (!empty($suggestions)) {
            echo "<h4 style='color: #b45309; margin: 10px 0 5px 0;'>💡 Đề xuất tối ưu (Thiếu sót tiềm năng):</h4>";
            foreach ($suggestions as $s) {
                $totalSuggestions++;
                echo "<div class='suggestion'>$s</div>";
            }
        } else if (!empty($groupedIndexes)) {
             echo "<div class='suggestion' style='border-left-color: #10b981; background-color: #f0fdf4; color: #065f46;'>✅ Cấu trúc Index của bảng này có vẻ đã tương đối ổn đối với các trường thông dụng.</div>";
        }
        
        echo "</div>";
    }
    
    if ($totalSuggestions === 0) {
        echo "<h2 style='text-align:center; color: #10b981;'>Tuyệt vời! Toàn bộ cơ sở dữ liệu đã chuẩn hóa Index rất tốt.</h2>";
    } else {
        echo "<p style='text-align:center; color: #475569;'>Hệ thống tìm thấy <strong>$totalSuggestions</strong> vị trí có thể thêm Index để tăng tốc độ truy vấn lớn. <br>Lưu ý: Chỉ thêm Index khi dữ liệu bảng đó thực sự lớn (vài chục nghìn dòng trở lên).</p>";
    }

} catch (Exception $e) {
    echo "<div class='card warning'>Lỗi hệ thống: " . htmlspecialchars($e->getMessage()) . "</div>";
}

echo "</body></html>";
?>
