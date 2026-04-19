<?php
require 'db_connect.php';
header('Content-Type: application/json');
$res = [
  'session' => $_SESSION,
  'current_admin_id' => $GLOBALS['current_admin_id'] ?? null,
];
if (!empty($_SESSION['user_id'])) {
  $stmt = $pdo->prepare("SELECT id, email, name, last_login FROM users WHERE id = ?");
  $stmt->execute([$_SESSION['user_id']]);
  $res['db_user'] = $stmt->fetch(PDO::FETCH_ASSOC);
}
echo json_encode($res);
