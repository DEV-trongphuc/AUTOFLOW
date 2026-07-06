<?php
header("Content-Type: text/plain; charset=UTF-8");
require_once __DIR__ . '/db_connect.php';

echo "=== PDO DIAGNOSTICS ===\n";
echo "DB Connected: " . ($pdo ? "YES" : "NO") . "\n";
echo "DB Type: " . $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) . "\n";

try {
    $bufferedAttr = $pdo->getAttribute(PDO::MYSQL_ATTR_USE_BUFFERED_QUERY);
    echo "MYSQL_ATTR_USE_BUFFERED_QUERY: " . ($bufferedAttr ? "TRUE" : "FALSE") . "\n";
} catch (Exception $e) {
    echo "MYSQL_ATTR_USE_BUFFERED_QUERY check failed: " . $e->getMessage() . "\n";
}

try {
    $emulatePrepares = $pdo->getAttribute(PDO::ATTR_EMULATE_PREPARES);
    echo "ATTR_EMULATE_PREPARES: " . ($emulatePrepares ? "TRUE" : "FALSE") . "\n";
} catch (Exception $e) {
    echo "ATTR_EMULATE_PREPARES check failed: " . $e->getMessage() . "\n";
}

try {
    $testStmt = $pdo->prepare("SELECT 1");
    $testStmt->execute();
    $testStmt->closeCursor();
    echo "Test Query SELECT 1: SUCCESS\n";
} catch (Exception $e) {
    echo "Test Query SELECT 1: FAILED - " . $e->getMessage() . "\n";
}

echo "\n=== FILE CONTENTS ON SERVER ===\n";
$optimizeSrc = @file_get_contents(__DIR__ . '/db_auto_optimize.php');
if ($optimizeSrc) {
    if (preg_match('/=== KHỞI ĐỘNG HỆ THỐNG BẢO TRÌ DATABASE AUTOFLOW (v\d+\.\d+\.\d+) ===/', $optimizeSrc, $m)) {
        echo "db_auto_optimize.php Version: " . $m[1] . "\n";
    } else {
        echo "db_auto_optimize.php Version: NOT FOUND\n";
    }
} else {
    echo "Failed to read db_auto_optimize.php\n";
}

$connectSrc = @file_get_contents(__DIR__ . '/db_connect.php');
if ($connectSrc) {
    echo "db_connect.php closeCursor count: " . substr_count($connectSrc, 'closeCursor()') . "\n";
} else {
    echo "Failed to read db_connect.php\n";
}
?>
