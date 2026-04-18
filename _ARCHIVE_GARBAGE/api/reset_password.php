<?php
require_once 'db_connect.php';
header('Content-Type: text/plain; charset=utf-8');

$username = $_GET['u'] ?? 'admin';
$newPass = $_GET['p'] ?? 'Ideas@812';

echo "=== RESET PASSWORD ===\n\n";
echo "Target User: $username\n";
echo "New Password: $newPass\n\n";

try {
    // 1. Kiểm tra user có tồn tại không
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user) {
        echo "❌ Lỗi: Không tìm thấy user có tên '$username'.\n";
        echo "Các user hiện có:\n";
        $all = $pdo->query("SELECT username FROM users")->fetchAll(PDO::FETCH_COLUMN);
        echo implode(", ", $all);
    } else {
        // 2. Update password
        $hash = password_hash($newPass, PASSWORD_DEFAULT);
        $update = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
        $update->execute([$hash, $user['id']]);

        echo "✅ THÀNH CÔNG!\n";
        echo "Mật khẩu cho user '$username' đã được đổi thành: '$newPass'\n";
        echo "Bạn có thể đăng nhập ngay bây giờ.";
    }

} catch (Exception $e) {
    echo "Lỗi hệ thống: " . $e->getMessage();
}
?>