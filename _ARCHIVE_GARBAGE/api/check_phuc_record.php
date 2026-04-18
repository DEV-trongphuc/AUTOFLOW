<?php
require_once 'db_connect.php';

$email = 'phucht@ideas.edu.vn';
$stmt = $pdo->prepare("SELECT * FROM subscribers WHERE email = ?");
$stmt->execute([$email]);
$sub = $stmt->fetch();

echo "--- Subscriber Record ---\n";
print_r($sub);
