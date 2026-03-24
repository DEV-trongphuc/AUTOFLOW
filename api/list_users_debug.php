<?php
require_once 'db_connect.php';
header('Content-Type: text/plain; charset=utf-8');

echo "=== DANH SÁCH USER ===\n\n";

try {
    $stmt = $pdo->query("SELECT id, username, full_name, role, created_at FROM users");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (count($users) === 0) {
        echo "Không tìm thấy user nào trong bảng 'users'.\n";
    } else {
        foreach ($users as $u) {
            echo "ID: " . $u['id'] . "\n";
            echo "Username: " . $u['username'] . "\n";
            echo "Full Name: " . $u['full_name'] . "\n";
            echo "------------------------\n";
        }
    }
} catch (Exception $e) {
    echo "Lỗi: " . $e->getMessage();
}
?>