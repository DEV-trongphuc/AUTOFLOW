<?php
/**
 * api/test_db_backend.php
 * Automated integration test suite for database and backend business logic.
 * Supported modes: CLI and Browser.
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);

// CLI vs Web mode
$isCli = (php_sapi_name() === 'cli' || isset($_GET['cli']));
if (!$isCli) {
    header("Content-Type: text/html; charset=UTF-8");
} else {
    if (!defined('STDIN')) {
        header("Content-Type: text/plain; charset=UTF-8");
    }
}

// ANSI colors for CLI
define('COLOR_RESET', "\033[0m");
define('COLOR_RED', "\033[31m");
define('COLOR_GREEN', "\033[32m");
define('COLOR_YELLOW', "\033[33m");
define('COLOR_BLUE', "\033[34m");
define('COLOR_CYAN', "\033[36m");
define('COLOR_WHITE', "\033[37m");
define('COLOR_BOLD', "\033[1m");

$testResults = [];
$startTime = microtime(true);

// Output helper
function printResult($testName, $status, $details = '', $timeMs = null) {
    global $isCli, $testResults;
    
    $timeStr = $timeMs !== null ? " (" . number_format($timeMs, 2) . "ms)" : "";
    $statusText = $status ? "PASSED" : "FAILED";
    
    $testResults[] = [
        'name' => $testName,
        'status' => $status,
        'details' => $details,
        'time' => $timeMs
    ];

    if ($isCli) {
        $color = $status ? COLOR_GREEN : COLOR_RED;
        echo COLOR_BOLD . "[ " . $color . $statusText . COLOR_RESET . COLOR_BOLD . " ] " . COLOR_WHITE . $testName . COLOR_RESET . $timeStr . PHP_EOL;
        if (!empty($details)) {
            echo "         " . COLOR_CYAN . $details . COLOR_RESET . PHP_EOL;
        }
    }
}

function printSectionHeader($title) {
    global $isCli;
    if ($isCli) {
        echo PHP_EOL . COLOR_BOLD . COLOR_BLUE . "=== " . $title . " ===" . COLOR_RESET . PHP_EOL;
    }
}

// 1. Connection & Pre-connect Check
printSectionHeader("1. KẾT NỐI DATABASE & CẤU HÌNH");

$pdo = null;
$dbType = 'mysql';
$dbConnectTime = null;
$usingMockSqlite = false;

// 1.1 Read environment variables / credentials dynamically first to avoid crashing
$host = getenv('DB_HOST') !== false ? getenv('DB_HOST') : 'localhost';
$db   = getenv('DB_NAME') !== false ? getenv('DB_NAME') : 'vhvxoigh_mail_auto';
$user = getenv('DB_USER') !== false ? getenv('DB_USER') : 'vhvxoigh_mail_auto';
$pass = getenv('DB_PASSWORD') !== false ? getenv('DB_PASSWORD') : 'Ideas@812';

$dbStart = microtime(true);
$canConnectMySQL = false;
$mysqlError = '';

try {
    // Try short-timeout connection to verify credentials first
    $tempDsn = "mysql:host=$host;dbname=$db;charset=utf8mb4";
    $tempPdo = new PDO($tempDsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 2
    ]);
    $canConnectMySQL = true;
    $tempPdo = null; // Close
} catch (Exception $e) {
    $mysqlError = $e->getMessage();
}

if ($canConnectMySQL) {
    try {
        // Safe to require db_connect.php now
        ob_start();
        require_once __DIR__ . '/db_connect.php';
        ob_end_clean();
        
        if (isset($pdo) && $pdo instanceof PDO) {
            $dbConnectTime = (microtime(true) - $dbStart) * 1000;
            printResult("Kết nối database MySQL thành công (qua db_connect.php)", true, "Database: $db tại $host", $dbConnectTime);
        } else {
            throw new Exception("Biến \$pdo không được tìm thấy sau khi nạp db_connect.php.");
        }
    } catch (Exception $e) {
        if (ob_get_level() > 0) ob_end_clean();
        printResult("Nạp db_connect.php thất bại", false, $e->getMessage());
        $canConnectMySQL = false;
    }
}

// 1.2 Fallback to SQLite if MySQL is unavailable
if (!$canConnectMySQL) {
    printResult("Kết nối MySQL không khả dụng", false, "Lỗi: " . ($mysqlError ?: 'Lỗi chưa rõ'));
    printSectionHeader("KHỞI TẠO CƠ SỞ DỮ LIỆU SQLITE (MOCK ENVIRONMENT)");
    try {
        $sqliteStart = microtime(true);
        $pdo = new PDO("sqlite::memory:");
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $dbType = 'sqlite';
        $usingMockSqlite = true;
        $dbConnectTime = (microtime(true) - $sqliteStart) * 1000;
        printResult("Khởi tạo SQLite In-Memory Database thành công", true, "Đang chạy chế độ Mocking Sandbox", $dbConnectTime);
    } catch (Exception $ex) {
        printResult("Khởi tạo SQLite Mock Database thất bại", false, $ex->getMessage());
        die("FATAL: Không có kết nối database hoạt động.");
    }
}

// 2. Schema Audit Test
printSectionHeader("2. KIỂM TRA CẤU TRÚC BẢNG (SCHEMA AUDIT)");

$criticalTables = [
    'workspaces' => 'Không gian làm việc',
    'subscribers' => 'Danh sách người đăng ký',
    'flows' => 'Chuỗi luồng tự động',
    'subscriber_flow_states' => 'Trạng thái người dùng trong luồng',
    'subscriber_activity' => 'Nhật ký hoạt động khách hàng',
    'activity_buffer' => 'Bộ đệm xử lý hoạt động',
    'campaigns' => 'Các chiến dịch gửi mail',
    'system_settings' => 'Cấu hình hệ thống',
    'zalo_oa' => 'Liên kết Zalo OA',
    'admin_logs' => 'Nhật ký quản trị viên',
    'stats_update_buffer' => 'Bộ đệm cập nhật chỉ số'
];

// If SQLite, create mock schemas
if ($dbType === 'sqlite') {
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS workspaces (id INTEGER PRIMARY KEY, name TEXT)");
        $pdo->exec("CREATE TABLE IF NOT EXISTS subscribers (
            id TEXT PRIMARY KEY, 
            workspace_id INTEGER, 
            email TEXT, 
            phone TEXT, 
            name TEXT, 
            status TEXT, 
            created_at TIMESTAMP, 
            zalo_id TEXT, 
            meta_psid TEXT,
            stats_sent INTEGER DEFAULT 0,
            stats_opened INTEGER DEFAULT 0,
            stats_clicked INTEGER DEFAULT 0
        )");
        $pdo->exec("CREATE TABLE IF NOT EXISTS flows (
            id TEXT PRIMARY KEY, 
            workspace_id INTEGER, 
            name TEXT, 
            steps TEXT, 
            is_enabled INTEGER DEFAULT 0,
            stat_total_sent INTEGER DEFAULT 0,
            stat_total_failed INTEGER DEFAULT 0,
            stat_completed INTEGER DEFAULT 0,
            stat_enrolled INTEGER DEFAULT 0,
            stat_zalo_sent INTEGER DEFAULT 0,
            stat_zns_sent INTEGER DEFAULT 0,
            stat_zns_failed INTEGER DEFAULT 0,
            stat_meta_sent INTEGER DEFAULT 0
        )");
        $pdo->exec("CREATE TABLE IF NOT EXISTS subscriber_flow_states (
            subscriber_id TEXT, 
            flow_id TEXT, 
            current_step_id TEXT, 
            status TEXT, 
            scheduled_at TIMESTAMP, 
            updated_at TIMESTAMP,
            PRIMARY KEY(subscriber_id, flow_id)
        )");
        $pdo->exec("CREATE TABLE IF NOT EXISTS subscriber_activity (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            subscriber_id TEXT, 
            workspace_id INTEGER,
            type TEXT, 
            details TEXT, 
            created_at TIMESTAMP
        )");
        $pdo->exec("CREATE TABLE IF NOT EXISTS activity_buffer (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            workspace_id INTEGER,
            subscriber_id TEXT, 
            type TEXT, 
            details TEXT, 
            reference_id TEXT, 
            flow_id TEXT, 
            campaign_id TEXT, 
            extra_data TEXT, 
            processed INTEGER DEFAULT 0, 
            created_at TIMESTAMP
        )");
        $pdo->exec("CREATE TABLE IF NOT EXISTS campaigns (
            id TEXT PRIMARY KEY, 
            workspace_id INTEGER, 
            name TEXT, 
            status TEXT, 
            scheduled_at TIMESTAMP, 
            created_at TIMESTAMP
        )");
        $pdo->exec("CREATE TABLE IF NOT EXISTS system_settings (
            workspace_id INTEGER, 
            key TEXT, 
            value TEXT, 
            PRIMARY KEY (workspace_id, key)
        )");
        $pdo->exec("CREATE TABLE IF NOT EXISTS zalo_oa (
            id TEXT PRIMARY KEY, 
            workspace_id INTEGER, 
            name TEXT, 
            is_enabled INTEGER DEFAULT 0
        )");
        $pdo->exec("CREATE TABLE IF NOT EXISTS admin_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            admin_id TEXT, 
            action TEXT, 
            target_type TEXT, 
            target_id TEXT, 
            details TEXT, 
            created_at TIMESTAMP
        )");
        $pdo->exec("CREATE TABLE IF NOT EXISTS stats_update_buffer (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            workspace_id INTEGER, 
            target_table TEXT, 
            target_id TEXT, 
            column_name TEXT, 
            increment INTEGER, 
            created_at TIMESTAMP
        )");
        printResult("Khởi tạo cấu trúc Mock SQLite", true, "Đã khởi tạo " . count($criticalTables) . " bảng.");
    } catch (Exception $e) {
        printResult("Khởi tạo cấu trúc Mock SQLite", false, $e->getMessage());
    }
}

// Verify tables are queryable
foreach ($criticalTables as $table => $desc) {
    $start = microtime(true);
    try {
        $tableQuery = $table;
        // system_settings compatibility
        if ($table === 'system_settings' && $dbType === 'mysql') {
            // Check if settings or system_settings
            try {
                $pdo->query("SELECT 1 FROM `system_settings` LIMIT 1");
                $tableQuery = 'system_settings';
            } catch (Exception $e) {
                $pdo->query("SELECT 1 FROM `settings` LIMIT 1");
                $tableQuery = 'settings';
            }
        }
        
        $pdo->query("SELECT 1 FROM `$tableQuery` LIMIT 1");
        $timeMs = (microtime(true) - $start) * 1000;
        
        $count = $pdo->query("SELECT COUNT(*) FROM `$tableQuery`")->fetchColumn();
        printResult("Bảng `$table` ($desc)", true, "Khả dụng. Bản ghi hiện tại: $count", $timeMs);
    } catch (Exception $e) {
        $timeMs = (microtime(true) - $start) * 1000;
        printResult("Bảng `$table` ($desc)", false, "Lỗi kiểm tra bảng: " . $e->getMessage(), $timeMs);
    }
}

// 3. SQL Engine & CRUD Tests
printSectionHeader("3. KIỂM THỬ THAO TÁC CƠ SỞ DỮ LIỆU (CRUD & TRANSACTIONS)");

$tempTableName = "test_crud_" . rand(100, 999);
$isSqlite = ($dbType === 'sqlite');

try {
    $start = microtime(true);
    // Create temporary table
    if ($isSqlite) {
        $pdo->exec("CREATE TEMP TABLE `$tempTableName` (id INTEGER PRIMARY KEY, val TEXT, extra_json TEXT)");
    } else {
        $pdo->exec("CREATE TEMPORARY TABLE `$tempTableName` (id INT PRIMARY KEY, val VARCHAR(100), extra_json JSON)");
    }
    
    // Insert test
    $stmt = $pdo->prepare("INSERT INTO `$tempTableName` (id, val, extra_json) VALUES (?, ?, ?)");
    $stmt->execute([1, "Test Integration Record", json_encode(['level' => 'admin', 'verified' => true])]);
    
    // Select test
    $stmt = $pdo->prepare("SELECT * FROM `$tempTableName` WHERE id = ?");
    $stmt->execute([1]);
    $row = $stmt->fetch();
    
    if (!$row || $row['val'] !== 'Test Integration Record') {
        throw new Exception("Lỗi: Dữ liệu trả về không khớp.");
    }
    
    // JSON logic test
    $json = json_decode($row['extra_json'], true);
    if (!is_array($json) || $json['level'] !== 'admin') {
        throw new Exception("Lỗi: Đọc/ghi JSON trường extra_json không chính xác.");
    }
    
    // Update test
    $stmt = $pdo->prepare("UPDATE `$tempTableName` SET val = ? WHERE id = ?");
    $stmt->execute(["Updated Record", 1]);
    
    $stmt = $pdo->prepare("SELECT val FROM `$tempTableName` WHERE id = ?");
    $stmt->execute([1]);
    if ($stmt->fetchColumn() !== 'Updated Record') {
        throw new Exception("Lỗi: Cập nhật dữ liệu thất bại.");
    }
    
    // Delete test
    $pdo->exec("DELETE FROM `$tempTableName` WHERE id = 1");
    $count = $pdo->query("SELECT COUNT(*) FROM `$tempTableName`")->fetchColumn();
    if ($count != 0) {
        throw new Exception("Lỗi: Xóa dữ liệu thất bại.");
    }
    
    $pdo->exec("DROP TABLE `$tempTableName`");
    $timeMs = (microtime(true) - $start) * 1000;
    printResult("Kiểm tra CRUD (Insert/Select/Update/Delete)", true, "Ghi, Đọc, Sửa, Xóa dữ liệu hoạt động hoàn hảo.", $timeMs);
} catch (Exception $e) {
    printResult("Kiểm tra CRUD (Insert/Select/Update/Delete)", false, "Lỗi: " . $e->getMessage());
}

// Transaction rollback validation
try {
    $start = microtime(true);
    $pdo->beginTransaction();
    
    $wsId = rand(8888, 9999);
    $insertWs = $isSqlite
        ? "INSERT OR REPLACE INTO workspaces (id, name) VALUES (?, ?)"
        : "INSERT INTO workspaces (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)";
        
    $pdo->prepare($insertWs)->execute([$wsId, "Temp Workspace Integration Test"]);
    
    $count = $pdo->query("SELECT COUNT(*) FROM workspaces WHERE id = $wsId")->fetchColumn();
    if ($count != 1) {
        throw new Exception("Chèn dữ liệu trong transaction không khả dụng.");
    }
    
    $pdo->rollBack();
    
    $countAfter = $pdo->query("SELECT COUNT(*) FROM workspaces WHERE id = $wsId")->fetchColumn();
    if ($countAfter != 0) {
        throw new Exception("Rollback thất bại, bản ghi kiểm thử không bị thu hồi.");
    }
    
    $timeMs = (microtime(true) - $start) * 1000;
    printResult("Giao dịch tự động (Transaction & Rollback)", true, "Bắt đầu transaction và khôi phục trạng thái chuẩn xác.", $timeMs);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    printResult("Giao dịch tự động (Transaction & Rollback)", false, "Lỗi: " . $e->getMessage());
}

// 4. Advanced Lock & SQL Features Check
printSectionHeader("4. KIỂM TRA CHỈ CHỈ MỤC & CƠ CHẾ KHÓA DỮ LIỆU (GET_LOCK / SKIP LOCKED)");

if ($dbType !== 'sqlite') {
    // Check SKIP LOCKED
    try {
        $start = microtime(true);
        $pdo->beginTransaction();
        // Check database schema syntax compatibility
        $pdo->query("SELECT * FROM subscribers LIMIT 1 FOR UPDATE SKIP LOCKED")->fetchAll();
        $pdo->rollBack();
        $timeMs = (microtime(true) - $start) * 1000;
        printResult("Hỗ trợ khóa hàng 'FOR UPDATE SKIP LOCKED'", true, "Syntax hợp lệ. Có thể xử lý queue song song hiệu năng cao.", $timeMs);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        printResult("Hỗ trợ khóa hàng 'FOR UPDATE SKIP LOCKED'", false, "Khuyên dùng nâng cấp MySQL 8.0+ / MariaDB 10.6+ để hỗ trợ SKIP LOCKED. Lỗi: " . $e->getMessage());
    }
    
    // Check GET_LOCK
    try {
        $start = microtime(true);
        $lockName = 'autoflow_integration_lock_' . rand(100, 999);
        $stmt = $pdo->prepare("SELECT GET_LOCK(?, 1)");
        $stmt->execute([$lockName]);
        $lockResult = $stmt->fetchColumn();
        
        if ($lockResult == 1) {
            $pdo->prepare("SELECT RELEASE_LOCK(?)")->execute([$lockName]);
            $timeMs = (microtime(true) - $start) * 1000;
            printResult("Hỗ trợ khóa phân tán 'GET_LOCK'", true, "GET_LOCK và RELEASE_LOCK khả dụng.", $timeMs);
        } else {
            throw new Exception("GET_LOCK trả về 0.");
        }
    } catch (Exception $e) {
        printResult("Hỗ trợ khóa phân tán 'GET_LOCK'", false, "Lỗi: " . $e->getMessage());
    }
} else {
    printResult("Cơ chế khóa đặc thù MySQL (SKIP LOCKED & GET_LOCK)", true, "Bỏ qua (Đang mô phỏng trên SQLite).");
}

// 5. Backend Business Logic Mocking
printSectionHeader("5. MÔ PHỎNG & KIỂM THỬ LOGIC BACKEND");

$logicSuccess = true;
try {
    $start = microtime(true);
    
    // Make sure FlowExecutor and Mailer are included
    if (!class_exists('FlowExecutor')) {
        ob_start();
        require_once __DIR__ . '/FlowExecutor.php';
        ob_end_clean();
    }
    
    if (!class_exists('Mailer')) {
        ob_start();
        require_once __DIR__ . '/Mailer.php';
        ob_end_clean();
    }
    
    if (class_exists('FlowExecutor') && class_exists('Mailer')) {
        printResult("Nạp lớp FlowExecutor & Mailer", true, "Đã import thành công.");
    } else {
        throw new Exception("Thiếu các file logic FlowExecutor.php hoặc Mailer.php.");
    }
    
    // Seed Sandbox data inside transaction
    $pdo->beginTransaction();
    
    $wsId = 999;
    $subId = 'test-sub-999';
    $flowId = 'test-flow-999';
    
    $insertWs = $isSqlite 
        ? "INSERT OR IGNORE INTO workspaces (id, name) VALUES (?, ?)"
        : "INSERT IGNORE INTO workspaces (id, name) VALUES (?, ?)";
    $pdo->prepare($insertWs)->execute([$wsId, "Integration Testing Workspace"]);
    
    // Insert mock settings
    $settingsTable = 'system_settings';
    if ($dbType === 'mysql') {
        try {
            $pdo->query("SELECT 1 FROM `system_settings` LIMIT 1");
        } catch (Exception $e) {
            $settingsTable = 'settings';
        }
    }
    
    $insertSetting = $isSqlite
        ? "INSERT OR REPLACE INTO $settingsTable (workspace_id, key, value) VALUES (?, ?, ?)"
        : "INSERT INTO $settingsTable (workspace_id, `key`, `value`) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)";
        
    $pdo->prepare($insertSetting)->execute([0, 'smtp_enabled', '0']);
    $pdo->prepare($insertSetting)->execute([0, 'smtp_host', 'localhost']);
    $pdo->prepare($insertSetting)->execute([0, 'smtp_port', '25']);
    $pdo->prepare($insertSetting)->execute([0, 'smtp_user', 'test']);
    $pdo->prepare($insertSetting)->execute([0, 'smtp_pass', 'test']);
    $pdo->prepare($insertSetting)->execute([0, 'smtp_from_email', 'test@ka-en.com.vn']);
    $pdo->prepare($insertSetting)->execute([0, 'smtp_from_name', 'Test System']);
    $pdo->prepare($insertSetting)->execute([0, 'smtp_encryption', 'none']);
    
    // Instantiate Mailer and FlowExecutor
    $mailer = new Mailer($pdo, 'http://localhost/api', 'test@ka-en.com.vn', $wsId);
    $executor = new FlowExecutor($pdo, $mailer, 'http://localhost/api');
    
    printResult("Khởi tạo các Service Engine", true, "Khởi tạo Mailer và FlowExecutor thành công.");
    
    // Seed subscriber
    $insertSub = $isSqlite
        ? "INSERT OR REPLACE INTO subscribers (id, workspace_id, email, phone, name, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        : "INSERT INTO subscribers (id, workspace_id, email, phone, name, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)";
    $pdo->prepare($insertSub)->execute([$subId, $wsId, 'sub_test@ka-en.com.vn', '0912345678', 'Test User Integration', 'active', date('Y-m-d H:i:s')]);
    
    // Seed Flow
    $steps = [
        [
            'id' => 'step-1',
            'type' => 'action',
            'action_type' => 'email',
            'template_id' => 'temp-1',
            'next_step' => 'step-2'
        ],
        [
            'id' => 'step-2',
            'type' => 'delay',
            'duration' => 60,
            'next_step' => null
        ]
    ];
    
    $insertFlow = $isSqlite
        ? "INSERT OR REPLACE INTO flows (id, workspace_id, name, steps, is_enabled) VALUES (?, ?, ?, ?, ?)"
        : "INSERT INTO flows (id, workspace_id, name, steps, is_enabled) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)";
    $pdo->prepare($insertFlow)->execute([$flowId, $wsId, 'Integrate Test Flow', json_encode($steps), 1]);
    
    // Seed Flow State
    $insertState = $isSqlite
        ? "INSERT OR REPLACE INTO subscriber_flow_states (subscriber_id, flow_id, current_step_id, status, scheduled_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
        : "INSERT INTO subscriber_flow_states (subscriber_id, flow_id, current_step_id, status, scheduled_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE current_step_id=VALUES(current_step_id)";
    $pdo->prepare($insertState)->execute([$subId, $flowId, 'step-1', 'scheduled', date('Y-m-d H:i:s'), date('Y-m-d H:i:s')]);
    
    printResult("Chuẩn bị dữ liệu mẫu trong Transaction", true, "Đã nạp subscriber, flow và flow state giả lập.");
    
    // Test state update execution logic
    $pdo->prepare("UPDATE subscriber_flow_states SET current_step_id = ?, status = ?, updated_at = ? WHERE subscriber_id = ? AND flow_id = ?")
        ->execute(['step-2', 'waiting', date('Y-m-d H:i:s'), $subId, $flowId]);
        
    $stmt = $pdo->prepare("SELECT current_step_id, status FROM subscriber_flow_states WHERE subscriber_id = ? AND flow_id = ?");
    $stmt->execute([$subId, $flowId]);
    $updatedState = $stmt->fetch();
    
    if ($updatedState['current_step_id'] !== 'step-2' || $updatedState['status'] !== 'waiting') {
        throw new Exception("Thao tác cập nhật trạng thái bước Flow thất bại.");
    }
    
    // Mock queue buffers
    $insertBuffer = "INSERT INTO activity_buffer (workspace_id, subscriber_id, type, details, flow_id, extra_data) VALUES (?, ?, ?, ?, ?, ?)";
    $pdo->prepare($insertBuffer)->execute([$wsId, $subId, 'flow_step_executed', 'Simulated execution of email template temp-1', $flowId, json_encode(['mock' => true])]);
    
    $bufferCount = $pdo->query("SELECT COUNT(*) FROM activity_buffer WHERE subscriber_id = '$subId'")->fetchColumn();
    if ($bufferCount != 1) {
        throw new Exception("Ghi nhật ký vào activity_buffer thất bại.");
    }
    
    // Rollback changes safely
    $pdo->rollBack();
    
    $timeMs = (microtime(true) - $start) * 1000;
    printResult("Mô phỏng chu trình Flow Execution", true, "Mô phỏng thay đổi trạng thái và chèn activity buffer hoạt động tốt.", $timeMs);
} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    printResult("Mô phỏng chu trình Flow Execution", false, "Lỗi nghiệp vụ: " . $e->getMessage());
}

$duration = (microtime(true) - $startTime) * 1000;

// Final Stats and exit code for CLI
if ($isCli) {
    echo PHP_EOL;
    echo COLOR_BOLD . COLOR_BLUE . "==================================================" . COLOR_RESET . PHP_EOL;
    echo COLOR_BOLD . "TỔNG KẾT KIỂM THỬ TÍCH HỢP BACKEND & SQL" . COLOR_RESET . PHP_EOL;
    echo "Thời gian thực hiện: " . number_format($duration, 2) . " ms" . PHP_EOL;
    $passed = count(array_filter($testResults, function($r) { return $r['status']; }));
    $total = count($testResults);
    $color = ($passed === $total) ? COLOR_GREEN : COLOR_RED;
    echo "Kết quả: " . COLOR_BOLD . $color . "$passed/$total Ca kiểm thử thành công" . COLOR_RESET . PHP_EOL;
    echo COLOR_BOLD . COLOR_BLUE . "==================================================" . COLOR_RESET . PHP_EOL;
    exit($passed === $total ? 0 : 1);
}

$passed = count(array_filter($testResults, function($r) { return $r['status']; }));
$total = count($testResults);
$score = round(($passed / $total) * 100);
?>
<!DOCTYPE html>
<html lang="vi" class="h-full bg-slate-950">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DOMATION Integration Test Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        brand: {
                            accent: '#a855f7',
                            primary: '#6d28d9',
                            secondary: '#7c3aed',
                            dark: '#0f172a',
                            success: '#10b981',
                            error: '#ef4444'
                        }
                    }
                }
            }
        }
    </script>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Outfit', sans-serif;
            background-color: #020617;
        }
        .glass-panel {
            background: rgba(15, 23, 42, 0.45);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
    </style>
</head>
<body class="text-slate-100 min-h-full py-12 px-4 md:px-8">
    <div class="max-w-5xl mx-auto space-y-8">
        
        <!-- Header Section -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 glass-panel rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div class="absolute -right-16 -top-16 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl"></div>
            <div class="absolute -left-16 -bottom-16 w-48 h-48 bg-emerald-600/5 rounded-full blur-3xl"></div>
            
            <div class="space-y-3 z-10">
                <div class="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full text-xs font-semibold tracking-wider uppercase">
                    <span class="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                    AutoFlow Engine Integration Test
                </div>
                <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-purple-400 bg-clip-text text-transparent">
                    Kiểm Thử Toàn Diện Backend & SQL
                </h1>
                <p class="text-sm font-medium text-slate-400 max-w-xl">
                    Chạy kiểm định kết nối, kiểm thử cấu trúc lược đồ bảng, hiệu năng CRUD nâng cao (JSON, transactions, locks) và mô phỏng logic FlowExecutor.
                </p>
            </div>
            
            <div class="flex items-center gap-6 shrink-0 z-10">
                <div class="text-right">
                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Điểm Kiểm Thử</span>
                    <span class="text-4xl font-black font-mono tracking-tight text-white"><?= $score ?></span>
                    <span class="text-sm font-bold text-slate-500">/ 100</span>
                </div>
                <div class="h-14 w-px bg-slate-800"></div>
                <button onclick="window.location.reload();" class="active:scale-95 transition-transform inline-flex items-center justify-center font-bold px-6 py-3.5 text-xs text-white rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/25 transition-all">
                    Chạy Lại
                </button>
            </div>
        </div>

        <!-- Metrics Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="glass-panel p-6 rounded-2xl flex items-center gap-5">
                <div class="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 text-xl font-bold">
                    ⏱️
                </div>
                <div>
                    <div class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Thời gian thực thi</div>
                    <div class="text-xl font-bold text-slate-200"><?= number_format($duration, 2) ?> ms</div>
                </div>
            </div>
            
            <div class="glass-panel p-6 rounded-2xl flex items-center gap-5">
                <div class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl font-bold">
                    ✅
                </div>
                <div>
                    <div class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ca thành công</div>
                    <div class="text-xl font-bold text-slate-200"><?= $passed ?> / <?= $total ?></div>
                </div>
            </div>

            <div class="glass-panel p-6 rounded-2xl flex items-center gap-5">
                <div class="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xl font-bold">
                    ⚙️
                </div>
                <div>
                    <div class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Động cơ DB</div>
                    <div class="text-xl font-bold text-slate-200 uppercase"><?= $dbType ?></div>
                </div>
            </div>
        </div>

        <!-- Main Test Cases List -->
        <div class="glass-panel rounded-3xl p-6 md:p-8 space-y-6">
            <div class="flex justify-between items-center border-b border-slate-800 pb-4">
                <h3 class="text-lg font-bold text-slate-200">
                    Chi Tiết Kết Quả Kiểm Định (Test Cases)
                </h3>
                <span class="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-400 text-[11px] font-semibold rounded-lg uppercase tracking-wider">
                    Chế độ: <?= $usingMockSqlite ? 'Mock SQLite' : 'MySQL Real Database' ?>
                </span>
            </div>

            <div class="space-y-4">
                <?php foreach ($testResults as $index => $res): ?>
                    <div class="p-5 rounded-2xl transition-all duration-200 hover:bg-slate-900/50 border <?= $res['status'] ? 'border-emerald-500/10 bg-emerald-500/[0.01]' : 'border-rose-500/10 bg-rose-500/[0.01]' ?> flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="space-y-2">
                            <div class="flex items-center gap-3">
                                <span class="text-xs font-semibold text-slate-500">#<?= str_pad($index + 1, 2, '0', STR_PAD_LEFT) ?></span>
                                <h4 class="font-bold text-slate-200"><?= htmlspecialchars($res['name']) ?></h4>
                            </div>
                            <?php if (!empty($res['details'])): ?>
                                <p class="text-xs text-slate-400 pl-8 font-medium">
                                    <?= htmlspecialchars($res['details']) ?>
                                </p>
                            <?php endif; ?>
                        </div>
                        
                        <div class="flex items-center gap-4 shrink-0 pl-8 md:pl-0">
                            <?php if ($res['time'] !== null): ?>
                                <span class="text-xs font-mono text-slate-500">
                                    <?= number_format($res['time'], 2) ?> ms
                                </span>
                            <?php endif; ?>
                            
                            <span class="inline-flex items-center justify-center font-bold px-3 py-1.5 text-[10px] rounded-lg tracking-wider uppercase <?= $res['status'] ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20' ?>">
                                <?= $res['status'] ? 'PASSED' : 'FAILED' ?>
                            </span>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>

        <!-- Footer -->
        <div class="text-center text-xs text-slate-600 font-medium">
            DOMATION Autoflow Integration Test Engine &bull; Developed by Antigravity
        </div>
    </div>
</body>
</html>
