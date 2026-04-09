<?php
require_once 'db_connect.php';

$id = 'e7c5ab80021e243fcef2ab95d003384a';
$stmt = $pdo->prepare('SELECT active_days FROM meta_automation_scenarios WHERE id = ?');
$stmt->execute([$id]);
$res = $stmt->fetch();
if(!$res) { echo 'Scenario not found'; exit; }

$fixed = '{"0":{"start":"23:00","end":"05:00"},"1":{"start":"23:00","end":"05:00"},"2":{"start":"23:00","end":"05:00"},"3":{"start":"23:00","end":"05:00"},"4":{"start":"23:00","end":"05:00"},"5":{"start":"23:00","end":"05:00"},"6":{"start":"23:00","end":"05:00"}}';

$update = $pdo->prepare('UPDATE meta_automation_scenarios SET active_days = ? WHERE id = ?');
$update->execute([$fixed, $id]);
echo 'Database repaired successfully on ' . $_SERVER['HTTP_HOST'];
?>
