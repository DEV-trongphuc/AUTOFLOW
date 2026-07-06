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
?>
