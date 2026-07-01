<?php
require_once 'db_connect.php';

$email = 'dom.marketing.vn@gmail.com';
$stmt = $pdo->prepare("SELECT id, email, role, status FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch();

echo json_encode([
    'email' => $email,
    'user' => $user
]);
