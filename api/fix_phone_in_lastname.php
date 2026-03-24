<?php
/**
 * FIX: Subscribers bị import sai - số điện thoại nằm trong last_name
 * 
 * Trường hợp xảy ra:
 *   - Import CSV có cột "phone" nhưng bị map nhầm vào last_name (lỗi "ho" substring)
 *   - Kết quả: last_name = "922332325", phone_number = ""
 * 
 * Logic:
 *   1. Tìm subscriber có last_name chứa toàn số (hoặc bắt đầu bằng 0/+84)
 *   2. Nếu phone_number đang rỗng → chuyển last_name → phone_number, xóa last_name
 *   3. Nếu phone_number đã có rồi → chỉ xóa last_name (không ghi đè)
 *   4. Nếu last_name chứa "Tên + số" (VD: "Linh Tuệ 922332325") → tách số ra
 */

require_once 'bootstrap.php';

// Chỉ cho phép chạy từ CLI hoặc đã xác thực (bảo vệ script)
$isCliMode = php_sapi_name() === 'cli';
if (!$isCliMode) {
    // Khi chạy qua web, cần có query param ?confirm=yes để tránh chạy nhầm
    $confirm = $_GET['confirm'] ?? '';
    $dryRun  = ($_GET['dry_run'] ?? '1') === '1'; // Mặc định dry-run để an toàn
} else {
    $confirm = 'yes';
    $dryRun  = in_array('--dry-run', $argv ?? []);
}

if (!$isCliMode && $confirm !== 'yes') {
    header('Content-Type: application/json');
    echo json_encode([
        'error'   => 'Thêm ?confirm=yes vào URL để chạy script. Thêm &dry_run=0 để thực sự update.',
        'example' => '/api/fix_phone_in_lastname.php?confirm=yes&dry_run=1'
    ]);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

$log     = [];
$fixed   = 0;
$skipped = 0;
$errors  = 0;

// -----------------------------------------------------------------------
// BƯỚC 1: Tìm các subscriber nghi ngờ bị sai
// Pattern: last_name chứa toàn số, hoặc có dạng "Họ Tên 0912345678"
// -----------------------------------------------------------------------

/**
 * Kiểm tra chuỗi có phải số điện thoại VN không
 * Hỗ trợ: 0912345678, +84912345678, 84912345678, 922332325 (thiếu đầu 0)
 */
function looksLikePhoneNumber(string $str): bool {
    $s = trim($str);
    // Loại bỏ các ký tự thường thấy trong SĐT
    $cleaned = preg_replace('/[\s\-\.\(\)]+/', '', $s);
    
    // Toàn số, độ dài 9-12 ký tự (VN format)
    if (preg_match('/^\+?[0-9]{9,12}$/', $cleaned)) {
        return true;
    }
    return false;
}

/**
 * Tách phần số điện thoại ra khỏi chuỗi "Họ Tên 0912345678"
 * Trả về ['name' => 'Họ Tên', 'phone' => '0912345678'] hoặc null nếu không tìm thấy
 */
function extractPhoneFromName(string $str): ?array {
    $str = trim($str);
    // Tìm cụm số ở cuối chuỗi (có thể cách nhau bởi space)
    if (preg_match('/^(.*?)\s+(\+?[\d\s\-\.]{9,15})$/', $str, $m)) {
        $namePart  = trim($m[1]);
        $phonePart = preg_replace('/[\s\-\.]+/', '', $m[2]);
        if (preg_match('/^\+?[0-9]{9,12}$/', $phonePart)) {
            return ['name' => $namePart, 'phone' => $phonePart];
        }
    }
    return null;
}

try {
    // Lấy các subscriber có last_name đáng ngờ
    // Điều kiện: last_name không rỗng VÀ (toàn số HOẶC kết thúc bằng chuỗi số)
    $stmt = $pdo->query("
        SELECT id, email, first_name, last_name, phone_number
        FROM subscribers
        WHERE last_name IS NOT NULL 
          AND last_name != ''
          AND (
            -- Trường hợp 1: last_name toàn là số (VD: '922332325')  
            last_name REGEXP '^[+]?[0-9 \\-\\.]{9,15}$'
            OR
            -- Trường hợp 2: last_name kết thúc bằng SĐT (VD: 'Nguyễn Văn A 0912345678')
            last_name REGEXP '[[:space:]][+]?[0-9]{9,12}$'
          )
        ORDER BY id
        LIMIT 10000
    ");

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $log[] = "✅ Tìm thấy " . count($rows) . " subscriber cần kiểm tra.";
    $log[] = "⚙️  Chế độ: " . ($dryRun ? "DRY RUN (không thực sự update)" : "LIVE UPDATE");
    $log[] = str_repeat('-', 60);

    foreach ($rows as $row) {
        $id          = $row['id'];
        $email       = $row['email'];
        $lastName    = $row['last_name'];
        $currentPhone = $row['phone_number'];

        $newPhone = null;
        $newLastName = null;

        // --- Phân tích last_name ---
        if (looksLikePhoneNumber($lastName)) {
            // Trường hợp 1: last_name = "922332325" (toàn là SĐT)
            $newPhone    = preg_replace('/[\s\-\.]+/', '', trim($lastName));
            $newLastName = ''; // Xóa last_name
        } else {
            // Trường hợp 2: last_name = "Nguyễn Văn A 0912345678"
            $extracted = extractPhoneFromName($lastName);
            if ($extracted) {
                $newPhone    = $extracted['phone'];
                $newLastName = $extracted['name'];
            }
        }

        if ($newPhone === null) {
            // Không tìm được pattern rõ ràng → bỏ qua
            $skipped++;
            continue;
        }

        // --- Quyết định update ---
        if (!empty($currentPhone)) {
            // Đã có SĐT rồi → chỉ xóa phần số trong last_name, không ghi đè phone
            $action = "CHỈ SỬA LASTNAME (đã có phone: $currentPhone)";
            $finalPhone = $currentPhone; // Giữ nguyên
        } else {
            $action = "CHUYỂN SĐT: last_name='$lastName' → phone='$newPhone', lastName='$newLastName'";
            $finalPhone = $newPhone;
        }

        $log[] = "[$id] $email | $action";

        if (!$dryRun) {
            try {
                $updateStmt = $pdo->prepare("
                    UPDATE subscribers 
                    SET last_name = ?, phone_number = ?
                    WHERE id = ?
                ");
                $updateStmt->execute([$newLastName, $finalPhone, $id]);
                $fixed++;
            } catch (Exception $e) {
                $log[] = "  ❌ LỖI update [$id]: " . $e->getMessage();
                $errors++;
            }
        } else {
            $fixed++; // Đếm những cái sẽ được fix
        }
    }

    $log[] = str_repeat('-', 60);
    $log[] = "📊 KẾT QUẢ:";
    $log[] = "   - " . ($dryRun ? "Sẽ được fix" : "Đã fix") . ": $fixed subscriber";
    $log[] = "   - Bỏ qua (không xác định): $skipped subscriber";
    $log[] = "   - Lỗi: $errors";
    if ($dryRun) {
        $log[] = "";
        $log[] = "💡 Để thực sự update, thêm &dry_run=0 vào URL.";
    }

    echo json_encode([
        'success'  => true,
        'dry_run'  => $dryRun,
        'fixed'    => $fixed,
        'skipped'  => $skipped,
        'errors'   => $errors,
        'log'      => $log,
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage(),
        'log'     => $log,
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
