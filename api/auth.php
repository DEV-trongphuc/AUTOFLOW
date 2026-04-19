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

    // [FIX P11-H2] Brute-force protection using api_rate_limits table.
    // 5 failed attempts from same IP → locked out for 15 minutes.
    // Uses existing table structure: ip_address + action key + blocked_until.
    $clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $rateLimitAction = 'login';
    $maxAttempts = 5;
    $blockMinutes = 15;

    try {
        $stmtRate = $pdo->prepare(
            "SELECT attempts, blocked_until FROM api_rate_limits
             WHERE ip_address = ? AND action = ? LIMIT 1"
        );
        $stmtRate->execute([$clientIp, $rateLimitAction]);
        $rateRow = $stmtRate->fetch(PDO::FETCH_ASSOC);

        if ($rateRow) {
            // Check if currently blocked
            if (!empty($rateRow['blocked_until']) && strtotime($rateRow['blocked_until']) > time()) {
                $remainingMins = ceil((strtotime($rateRow['blocked_until']) - time()) / 60);
                jsonResponse(false, null, "Tài khoản tạm khóa do quá nhiều lần thử. Vui lòng thử lại sau {$remainingMins} phút.");
            }
        }
    } catch (Exception $e) { /* Rate limit table may not exist on old installs — fail open */ }

    try {
        // [FIX P39-AUTH] Use separate queries: first verify password, then load profile without password.
        // Prevents password hash from ever being part of the user object returned to frontend.
        $stmtPwd = $pdo->prepare("SELECT id, password FROM users WHERE username = ? AND status != 'disabled' LIMIT 1");
        $stmtPwd->execute([$username]);
        $pwdRow = $stmtPwd->fetch(PDO::FETCH_ASSOC);

        $loginSuccess = $pwdRow && password_verify($password, $pwdRow['password']);
        $user = $pwdRow; // Reference for backward compat with !$user check below

        if (!$loginSuccess) {
            // [FIX P11-H2] Record failed attempt
            try {
                $pdo->prepare(
                    "INSERT INTO api_rate_limits (ip_address, action, attempts, last_attempt_at)
                     VALUES (?, ?, 1, NOW())
                     ON DUPLICATE KEY UPDATE
                         attempts = attempts + 1,
                         last_attempt_at = NOW(),
                         blocked_until = IF(attempts + 1 >= ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), NULL)"
                )->execute([$clientIp, $rateLimitAction, $maxAttempts, $blockMinutes]);
            } catch (Exception $e) { /* fail silently if table missing */ }

            if (!$user) {
                jsonResponse(false, null, 'Tên đăng nhập hoặc mật khẩu không đúng');
            }
            jsonResponse(false, null, 'Tên đăng nhập hoặc mật khẩu không đúng');
        }

        // [FIX P11-H2] Clear rate limit record on successful login
        try {
            $pdo->prepare("DELETE FROM api_rate_limits WHERE ip_address = ? AND action = ?")
                ->execute([$clientIp, $rateLimitAction]);
        } catch (Exception $e) { /* fail silently */ }

        // [FIX P39-AUTH] Fetch safe user profile (no password column) after successful verify
        $stmtProfile = $pdo->prepare("SELECT id, username, email, full_name, name, picture, role, status, workspace_id, last_login FROM users WHERE id = ? LIMIT 1");
        $stmtProfile->execute([$pwdRow['id']]);
        $user = $stmtProfile->fetch(PDO::FETCH_ASSOC);
        if (!$user) {
            jsonResponse(false, null, 'Lỗi tải thông tin người dùng');
        }

        // Update last login
        $updateStmt = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
        $updateStmt->execute([$user['id']]);

        // Log Access
        try {
            $ip = $clientIp;
            $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
            $logId = bin2hex(random_bytes(16));
            $stmtLog = $pdo->prepare("INSERT IGNORE INTO user_access_logs (id, user_id, ip_address, device, action) VALUES (?, ?, ?, ?, 'login')");
            $stmtLog->execute([$logId, $user['id'], $ip, $ua]);
        } catch (Exception $e) { /* ignore */ }

        // [FIX P11-M3] Regenerate session ID after login to prevent Session Fixation.
        session_regenerate_id(true);

        // Set session
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'] ?? '';
        $_SESSION['full_name'] = $user['full_name'] ?? $user['name'] ?? '';

        // user object already has no password — safe to return
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
                // [P22-P2 PERF FIX] Only update last_login if it's been > 5 minutes since last update.
                // Previously this fired on EVERY session /check call (every page load / auth guard),
                // generating thousands of unnecessary DB writes/hour with no meaningful granularity gain.
                // 5-minute throttle reduces writes by ~500x while still showing accurate activity timestamps.
                $pdo->prepare("
                    UPDATE users SET last_login = NOW()
                    WHERE id = ?
                    AND (last_login IS NULL OR last_login < DATE_SUB(NOW(), INTERVAL 5 MINUTE))
                ")->execute([$_SESSION['user_id']]);
                
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

// [NEW] Lightweight activity ping — only updates last_login, no profile fetch
// Called by App.tsx heartbeat every 5 min to keep last_activity fresh while user is active
if ($method === 'GET' && $action === 'ping') {
        if (empty($GLOBALS['current_admin_id']) && !isset($_SESSION['user_id'])) {
        jsonResponse(false, null, 'Not authenticated'); // Silently ignored by frontend
    }
    try {
        // Throttle server-side: only update if last_login > 5 minutes ago
        $updateId = $_SESSION['user_id'] ?? '';
        if ($updateId === '1' || $updateId === 'admin-001') {
            $stmt = $pdo->prepare("
                UPDATE users SET last_login = NOW()
                WHERE (id = ? OR email = 'dom.marketing.vn@gmail.com' OR email = 'admin@mailflow.com')
                AND (last_login IS NULL OR last_login < DATE_SUB(NOW(), INTERVAL 5 MINUTE))
            ");
            $stmt->execute([$updateId]);
        } else {
            $stmt = $pdo->prepare("
                UPDATE users SET last_login = NOW()
                WHERE id = ?
                AND (last_login IS NULL OR last_login < DATE_SUB(NOW(), INTERVAL 5 MINUTE))
            ");
            $stmt->execute([$updateId]);
        }
        $rows = $stmt->rowCount();
        jsonResponse(true, ['user_id' => $updateId, 'affected' => $rows], 'ok');
    } catch (Exception $e) {
        jsonResponse(true, ['error' => $e->getMessage(), 'user_id' => $_SESSION['user_id'] ?? null], 'error'); 
    }
}

// Get access logs for current user (Sync real history)
if ($method === 'GET' && $action === 'logs') {

        if (empty($GLOBALS['current_admin_id']) && empty($_SESSION['user_id'])) {
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
        if (empty($GLOBALS['current_admin_id']) && empty($_SESSION['user_id'])) {
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

        // [FIX P14-L1] Guard against deleted user still holding a valid session.
        // Without this check, $user = false and $user['password'] throws a TypeError.
        if (!$user) {
            jsonResponse(false, null, 'Tài khoản không tồn tại hoặc đã bị xóa');
        }

        if (!password_verify($currentPassword, $user['password'])) {
            jsonResponse(false, null, 'Mật khẩu hiện tại không đúng');
        }

        // [P24-A1 SECURITY] Enforce minimum password policy server-side.
        // Frontend may validate, but POST requests can bypass frontend checks.
        if (mb_strlen($newPassword, 'UTF-8') < 8) {
            jsonResponse(false, null, 'Mật khẩu mới phải có ít nhất 8 ký tự');
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
