<?php
// api/diag_log_conflict.php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: text/plain');

echo "Starting Diagnostic...\n";

// 1. Mock Database connection if needed (or just include db_connect)
echo "Including db_connect.php...\n";
require_once 'db_connect.php';
echo "db_connect.php included.\n";

// 2. Check if logActivity already exists
if (function_exists('logActivity')) {
    echo "CRITICAL: logActivity already exists after db_connect!\n";
    $ref = new ReflectionFunction('logActivity');
    echo "Defined in: " . $ref->getFileName() . " : " . $ref->getStartLine() . "\n";
} else {
    echo "logActivity NOT defined after db_connect.\n";
}

// 3. Include flow_helpers.php (Standard helper)
echo "Including flow_helpers.php...\n";
require_once 'flow_helpers.php';
echo "flow_helpers.php included.\n";

if (function_exists('logActivity')) {
    echo "logActivity is defined now.\n";
    $ref = new ReflectionFunction('logActivity');
    echo "Defined in: " . $ref->getFileName() . " : " . $ref->getStartLine() . "\n";
}

// 4. Checking campaigns.php (Known potential conflict source)
echo "Including campaigns.php...\n";
try {
    require_once 'campaigns.php';
    echo "campaigns.php included without error.\n";
} catch (Error $e) {
    echo "FATAL ERROR including campaigns.php: " . $e->getMessage() . "\n";
}

// 5. Checking flows.php (Often included in worker context)
echo "Including flows.php...\n";
try {
    require_once 'flows.php';
    echo "flows.php included without error.\n";
} catch (Error $e) {
    echo "FATAL ERROR including flows.php: " . $e->getMessage() . "\n";
}

echo "Diagnostic Complete.\n";
