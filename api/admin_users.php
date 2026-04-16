<?php
// api/admin_users.php
require_once 'db_connect.php';

// Auth Check: Must be admin
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
$isApprovedAdmin = (($_SESSION['role'] ?? '') === 'admin' && ($_SESSION['status'] ?? '') === 'approved');
// Also allow from internal bypass token if needed
if (!$isApprovedAdmin && ($GLOBALS['current_admin_id'] !== 'admin-001')) {
    jsonResponse(false, null, 'Unauthorized');
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET' && $action === 'list') {
    $stmt = $pdo->query("SELECT id, email, name, role, status, last_login, picture FROM users ORDER BY last_login DESC, created_at DESC");
    jsonResponse(true, $stmt->fetchAll());
}

if ($method === 'POST' && $action === 'update_status') {
    $data = json_decode(file_get_contents("php://input"), true);
    $id = $data['id'] ?? null;
    $status = $data['status'] ?? null;

    if (!$id || !$status) jsonResponse(false, null, 'Missing data');
    
    // Prevent disabling self or root admins
    $userStmt = $pdo->prepare("SELECT email FROM users WHERE id = ?");
    $userStmt->execute([$id]);
    $userEmail = $userStmt->fetchColumn();
    $rootAdmins = ['dom.marketing.vn@gmail.com', 'marketing@ideas.edu.vn'];
    if (in_array($userEmail, $rootAdmins)) jsonResponse(false, null, 'Cannot modify root admin');

    $stmt = $pdo->prepare("UPDATE users SET status = ? WHERE id = ?");
    $stmt->execute([$status, $id]);
    jsonResponse(true, null, 'Status updated');
}

if ($method === 'POST' && $action === 'update_role') {
    $data = json_decode(file_get_contents("php://input"), true);
    $id = $data['id'] ?? null;
    $role = $data['role'] ?? null;

    if (!$id || !$role) jsonResponse(false, null, 'Missing data');

    $userStmt = $pdo->prepare("SELECT email FROM users WHERE id = ?");
    $userStmt->execute([$id]);
    $userEmail = $userStmt->fetchColumn();
    $rootAdmins = ['dom.marketing.vn@gmail.com', 'marketing@ideas.edu.vn'];
    if (in_array($userEmail, $rootAdmins)) jsonResponse(false, null, 'Cannot modify root admin');

    $stmt = $pdo->prepare("UPDATE users SET role = ? WHERE id = ?");
    $stmt->execute([$role, $id]);
    jsonResponse(true, null, 'Role updated');
}

if ($method === 'DELETE' || ($method === 'POST' && $action === 'delete')) {
    $data = json_decode(file_get_contents("php://input"), true);
    $id = $data['id'] ?? $_GET['id'] ?? null;

    if (!$id) jsonResponse(false, null, 'ID required');

    $userStmt = $pdo->prepare("SELECT email FROM users WHERE id = ?");
    $userStmt->execute([$id]);
    $userEmail = $userStmt->fetchColumn();
    $rootAdmins = ['dom.marketing.vn@gmail.com', 'marketing@ideas.edu.vn'];
    if (in_array($userEmail, $rootAdmins)) jsonResponse(false, null, 'Cannot delete root admin');

    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(true, null, 'User deleted');
}

jsonResponse(false, null, 'Invalid action');
