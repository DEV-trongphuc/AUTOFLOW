<?php
// api/git_pull.php
// Helper script to trigger git pull via HTTP to bypass SSH rate-limiting.

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';

$token = $_GET['token'] ?? '';
if ($token !== ADMIN_BYPASS_TOKEN) {
    http_response_code(403);
    die("Unauthorized access.");
}

echo "Bắt đầu Pull mã nguồn mới nhất từ GitHub...\n\n";

// Execute git pull
$output = shell_exec("git pull origin main 2>&1");

echo "<pre>" . htmlspecialchars($output) . "</pre>";
echo "\nHoàn tất!";
?>
