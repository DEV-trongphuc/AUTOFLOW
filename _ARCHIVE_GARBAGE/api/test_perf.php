<?php
// api/test_perf.php
require_once 'db_connect.php';

header('Content-Type: text/plain; charset=utf-8');
echo "🚀 BẮT ĐẦU KIỂM TRA HIỆU NĂNG: JSON vs BINARY PACKED\n";
echo "--------------------------------------------------\n";

try {
    // 1. Lấy 1 mẫu vector để test (768 dimensions)
    $stmt = $pdo->query("SELECT embedding, embedding_binary FROM ai_training_chunks WHERE embedding_binary IS NOT NULL LIMIT 1");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        die("❌ Lỗi: Không tìm thấy dữ liệu binary để test. Vui lòng chạy migrate_binary_vectors.php trước.");
    }

    $jsonStr = $row['embedding'];
    $binData = $row['embedding_binary'];

    // Số lần lặp để đo lường (10,000 lần để thấy rõ sự khác biệt)
    $iterations = 10000;

    echo "Cấu hình test:\n";
    echo "- Số lần giải mã: " . number_format($iterations) . " lần\n";
    echo "- Kích thước Vector: ~768 số thực\n\n";

    // --- TEST JSON ---
    echo "1. Đang đo lường JSON_DECODE...\n";
    $startJson = microtime(true);
    for ($i = 0; $i < $iterations; $i++) {
        $dummy = json_decode($jsonStr, true);
    }
    $endJson = microtime(true);
    $timeJson = ($endJson - $startJson) * 1000;

    // --- TEST BINARY ---
    echo "2. Đang đo lường BINARY UNPACK...\n";
    $startBin = microtime(true);
    for ($i = 0; $i < $iterations; $i++) {
        $dummy = array_values(unpack('f*', $binData));
    }
    $endBin = microtime(true);
    $timeBin = ($endBin - $startBin) * 1000;

    // --- KẾT QUẢ ---
    echo "\n--------------------------------------------------\n";
    echo "KẾT QUẢ:\n";
    echo "➤ JSON Decode: " . round($timeJson, 2) . " ms\n";
    echo "➤ Binary Unpack: " . round($timeBin, 2) . " ms\n";

    if ($timeBin < $timeJson) {
        $percent = round(($timeJson - $timeBin) / $timeJson * 100, 1);
        echo "\n🔥 KẾT LUẬN: Binary NHANH HƠN JSON " . $percent . "%!\n";
    }

    echo "--------------------------------------------------\n";
    echo "Giải thích: \n";
    echo "- JSON phải phân tích cú pháp chuỗi văn bản (String Parsing), cực kỳ tốn CPU.\n";
    echo "- Binary Unpack chỉ việc đọc trực tiếp các byte từ bộ nhớ (Direct Memory Access).\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
