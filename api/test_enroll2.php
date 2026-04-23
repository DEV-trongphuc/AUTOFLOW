<?php
require_once 'db_connect.php';

$targetId = '695c19b9c8c35';

// Check segments
$stmt = $pdo->prepare("SELECT * FROM segments WHERE id = ?");
$stmt->execute([$targetId]);
if ($stmt->fetch()) echo "It is a segment!\n";

// Check lists
$stmt = $pdo->prepare("SELECT * FROM lists WHERE id = ?");
$stmt->execute([$targetId]);
if ($stmt->fetch()) echo "It is a LIST!\n";

// Check integrations
$stmt = $pdo->prepare("SELECT * FROM integrations WHERE id = ?");
$stmt->execute([$targetId]);
if ($stmt->fetch()) echo "It is an INTEGRATION!\n";

