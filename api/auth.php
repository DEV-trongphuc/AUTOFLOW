<?php
// api/auth.php
require_once 'db_connect.php';

session_start();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Login
if ($method === 'POST' && $action === 'login') {
    $data = json_decode(file_get_contents("php://input"), true);
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';

    if (empty($username) || empty($password)) {
        jsonResponse(false, null, 'Username và password là bắt buộc');
    }

    try {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? LIMIT 1");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            jsonResponse(false, null, 'Tên đăng nhập hoặc mật khẩu không đúng');
        }

        // Verify password
        if (!password_verify($password, $user['password'])) {
            jsonResponse(false, null, 'Tên đăng nhập hoặc mật khẩu không đúng');
        }

        // Update last login
        $updateStmt = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
        $updateStmt->execute([$user['id']]);

        // Set session
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['full_name'] = $user['full_name'];

        // Return user data (without password)
        unset($user['password']);
        jsonResponse(true, $user, 'Đăng nhập thành công');
    } catch (Exception $e) {
        jsonResponse(false, null, 'Lỗi hệ thống: ' . $e->getMessage());
    }
}

// Check session/current user
if ($method === 'GET' && $action === 'check') {
    if (isset($_SESSION['user_id'])) {
        try {
            // Lấy dữ liệu mới nhất từ DB để đảm bảo Avatar/Role luôn đúng
            $stmt = $pdo->prepare("SELECT id, email, name, picture, role, status FROM users WHERE id = ?");
            $stmt->execute([$_SESSION['user_id']]);
            $user = $stmt->fetch();

            if ($user) {
                // Update last activity when session check happens
                $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = ?")->execute([$_SESSION['user_id']]);
                
                jsonResponse(true, $user);
            } else {
                session_destroy();
                jsonResponse(false, null, 'User not found');
            }
        } catch (Exception $e) {
            jsonResponse(false, null, $e->getMessage());
        }
    } else {
        jsonResponse(false, null, 'Chưa đăng nhập');
    }
}

// Get access logs for current user (Sync real history)
if ($method === 'GET' && $action === 'logs') {
    if (!isset($_SESSION['user_id'])) {
        jsonResponse(false, null, 'Unauthorized');
    }
    
    try {
        $stmt = $pdo->prepare("SELECT ip_address, device, created_at FROM user_access_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 10");
        $stmt->execute([$_SESSION['user_id']]);
        $logs = $stmt->fetchAll();
        jsonResponse(true, $logs);
    } catch (Exception $e) {
        jsonResponse(false, null, $e->getMessage());
    }
}

// Logout
if ($method === 'POST' && $action === 'logout') {
    session_destroy();
    jsonResponse(true, null, 'Đã đăng xuất');
}

// Change password
if ($method === 'POST' && $action === 'change-password') {
    if (!isset($_SESSION['user_id'])) {
        jsonResponse(false, null, 'Chưa đăng nhập');
    }

    $data = json_decode(file_get_contents("php://input"), true);
    $currentPassword = $data['currentPassword'] ?? '';
    $newPassword = $data['newPassword'] ?? '';

    if (empty($currentPassword) || empty($newPassword)) {
        jsonResponse(false, null, 'Vui lòng nhập đầy đủ thông tin');
    }

    try {
        $stmt = $pdo->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!password_verify($currentPassword, $user['password'])) {
            jsonResponse(false, null, 'Mật khẩu hiện tại không đúng');
        }

        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        $updateStmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
        $updateStmt->execute([$hashedPassword, $_SESSION['user_id']]);

        jsonResponse(true, null, 'Đổi mật khẩu thành công');
    } catch (Exception $e) {
        jsonResponse(false, null, 'Lỗi hệ thống: ' . $e->getMessage());
    }
}

jsonResponse(false, null, 'Invalid request');
?>