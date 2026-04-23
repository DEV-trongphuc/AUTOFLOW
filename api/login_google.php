<?php
// api/login_google.php
require_once 'db_connect.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $credential = $data['credential'] ?? '';

    if (empty($credential)) {
        jsonResponse(false, null, 'Credential is required');
    }

    // Verify Google Token via Google API
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://oauth2.googleapis.com/tokeninfo?id_token=" . urlencode($credential));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);  // [SECURITY] Enforce TLS for Google OAuth
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        jsonResponse(false, null, 'Invalid Google Token');
    }

    $payload = json_decode($response, true);
    $email = $payload['email'];
    $name = $payload['name'] ?? 'User';
    $picture = $payload['picture'] ?? '';
    
    $adminEmails = ['dom.marketing.vn@gmail.com', 'marketing@ideas.edu.vn'];

    try {
        // Find user by email
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user) {
            // Auto Register new user
            $role = (in_array($email, $adminEmails)) ? 'admin' : 'user';
            $status = (in_array($email, $adminEmails)) ? 'approved' : 'pending';

            $userId = bin2hex(random_bytes(16));
            $insert = $pdo->prepare("INSERT INTO users (id, username, email, name, picture, role, status, google_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $insert->execute([$userId, $email, $email, $name, $picture, $role, $status, $payload['sub']]);
            $user = [
                'id' => $userId,
                'email' => $email,
                'name' => $name,
                'picture' => $picture,
                'role' => $role,
                'status' => $status
            ];
        } else {
            // Update last login
            $update = $pdo->prepare("UPDATE users SET last_login = NOW(), picture = ?, name = ? WHERE id = ?");
            $update->execute([$picture, $name, $user['id']]);
            $user['picture'] = $picture;
            $user['name'] = $name;
        }

        if ($user['status'] !== 'approved') {
            jsonResponse(true, $user, 'PENDING_APPROVAL');
        }

        // Start session (Wait, db_connect already calls session_start and session_write_close)
        // Since we need to write to session, we must reopen it or handle it before db_connect's close.
        if (session_status() === PHP_SESSION_NONE || session_status() === PHP_SESSION_DISABLED) {
            session_start();
        } else {
            @session_start(); // Re-open if closed
        }
        
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['email'] = $user['email'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['name'] = $user['name'];
        $_SESSION['picture'] = $user['picture'];
        $_SESSION['status'] = $user['status'];
        
        // Log Access
        try {
            $ip = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
            $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
            $logId = bin2hex(random_bytes(16));
            $stmtLog = $pdo->prepare("INSERT INTO user_access_logs (id, user_id, ip_address, device, action) VALUES (?, ?, ?, ?, 'login')");
            $stmtLog->execute([$logId, $user['id'], $ip, $ua]);
        } catch (Exception $e) { /* ignore log errors */ }
        
        session_write_close();

        jsonResponse(true, $user, 'Login successful');
    } catch (Exception $e) {
        jsonResponse(false, null, 'Lỗi hệ thống, vui lòng thử lại.');
    }
}

jsonResponse(false, null, 'Invalid request');
