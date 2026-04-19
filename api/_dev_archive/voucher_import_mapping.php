<?php
// api/voucher_import_mapping.php
require_once 'bootstrap.php';
initializeSystem($pdo);

require_once 'AuthMiddleware.php';
AuthMiddleware::check();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, null, 'Method not allowed');
}

$campaignId = $_POST['campaign_id'] ?? null;
if (!$campaignId) {
    jsonResponse(false, null, 'Thiếu ID Campaign');
}

if (!isset($_FILES['csv_file']) || $_FILES['csv_file']['error'] !== UPLOAD_ERR_OK) {
    jsonResponse(false, null, 'Vui lòng chọn file CSV để tải lên.');
}

$file = $_FILES['csv_file']['tmp_name'];
$lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

if (count($lines) < 2) {
    jsonResponse(false, null, 'File CSV trống (cần ít nhất 1 dòng tiêu đề và 1 dòng dữ liệu).');
}

// Bỏ qua dòng tiêu đề
$dataLines = array_slice($lines, 1);

$successCount = 0;
$errorCount = 0;
$log = [];

foreach ($dataLines as $index => $line) {
    // Remove BOM and parse
    $line = preg_replace('/^\xEF\xBB\xBF/', '', trim($line));
    $parts = str_getcsv($line);
    
    if (count($parts) < 2) {
        $errorCount++;
        $log[] = "Dòng " . ($index + 2) . ": Cấu trúc không hợp lệ (cần ít nhất 2 cột).";
        continue;
    }

    $code = trim($parts[0]);
    $contact = trim($parts[1]); // có thể là email hoặc số điện thoại

    if (!$code || !$contact) {
        $errorCount++;
        $log[] = "Dòng " . ($index + 2) . ": Trống Mã hoặc Email/SDT.";
        continue;
    }

    $isEmail = filter_var($contact, FILTER_VALIDATE_EMAIL);
    
    try {
        $pdo->beginTransaction();

        // 1. Kiểm tra tồn tại mã code này ở campaign chưa ?
        $stmtCode = $pdo->prepare("SELECT id, subscriber_id, status FROM voucher_codes WHERE campaign_id = ? AND code = ? FOR UPDATE");
        $stmtCode->execute([$campaignId, $code]);
        $targetCode = $stmtCode->fetch(PDO::FETCH_ASSOC);

        if (!$targetCode) {
            // Không tồn tại -> báo lỗi
            $errorCount++;
            $log[] = "Dòng " . ($index + 2) . ": Mã '$code' không tồn tại trong Campaign này.";
            $pdo->rollBack();
            continue;
        }

        if ($targetCode['status'] === 'used') {
            $errorCount++;
            $log[] = "Dòng " . ($index + 2) . ": Mã '$code' đã bị sử dụng bởi người khác, không thể gán.";
            $pdo->rollBack();
            continue;
        }

        // 2. Tìm hoặc Tạo Subscriber
        $sid = null;
        if ($isEmail) {
            $stmtSub = $pdo->prepare("SELECT id FROM subscribers WHERE email = ? LIMIT 1");
            $stmtSub->execute([$contact]);
            $sid = $stmtSub->fetchColumn();
        } else {
            $stmtSub = $pdo->prepare("SELECT id FROM subscribers WHERE phone_number = ? LIMIT 1");
            $stmtSub->execute([$contact]);
            $sid = $stmtSub->fetchColumn();
        }

        if (!$sid) {
            // Tạo mới
            $sid = bin2hex(random_bytes(16));
            $field = $isEmail ? 'email' : 'phone_number';
            
            $pdo->prepare("INSERT INTO subscribers (id, $field, status, source) VALUES (?, ?, 'active', 'Voucher Import')")
                ->execute([$sid, $contact]);
        }

        // 3. Tiến hành Map
        $pdo->prepare("UPDATE voucher_codes SET subscriber_id = ?, status = 'available' WHERE id = ?")->execute([$sid, $targetCode['id']]);

        $pdo->commit();
        $successCount++;
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        $errorCount++;
        $log[] = "Dòng " . ($index + 2) . ": Lỗi hệ thống khi map mã.";
    }
}

jsonResponse(true, [
    'success' => $successCount,
    'failed' => $errorCount,
    'logs' => $log
], "Phân bổ thành công $successCount mã. Thất bại $errorCount dòng.");
