<?php
require 'db_connect.php';
$stmt = $pdo->query("SELECT NOW() as mq_now, @@global.time_zone as gz, @@session.time_zone as sz");
$row = $stmt->fetch(PDO::FETCH_ASSOC);

date_default_timezone_set('Asia/Ho_Chi_Minh');
echo "MySQL NOW: " . $row['mq_now'] . "\n";
echo "MySQL GZ: " . $row['gz'] . "\n";
echo "MySQL SZ: " . $row['sz'] . "\n";
echo "PHP date(): " . date('Y-m-d H:i:s') . "\n";
echo "PHP timezone: " . date_default_timezone_get() . "\n";
