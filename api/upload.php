<?php
// api/upload.php
require_once 'db_connect.php';
require_once 'ai_org_middleware.php';

// SECURITY: Enforce Auth
$currentOrgUser = requireAISpaceAuth();

// jsonResponse is already defined in db_connect.php — only define if missing
if (!function_exists('jsonResponse')) {
    function jsonResponse($success, $data = null, $message = '')
    {
        echo json_encode([
            'success' => $success,
            'data' => $data,
            'message' => $message
        ]);
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS')
    exit(0);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, null, 'Method not allowed');
}

if (!isset($_FILES['file'])) {
    jsonResponse(false, null, 'No file uploaded');
}

$file = $_FILES['file'];
$uploadDir = '../uploadss/'; // Folder nằm ngoài thư mục api một cấp
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Security Check
$allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'txt', 'csv', 'webp'];
$fileName = $file['name'];
$fileSize = $file['size'];
$fileTmp = $file['tmp_name'];
$fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

if (!in_array($fileExt, $allowedExts)) {
    jsonResponse(false, null, 'File type not allowed');
}

if ($fileSize > 10 * 1024 * 1024) { // 10MB Limit
    jsonResponse(false, null, 'File too large (Max 10MB)');
}

// Generate unique name but keep original name for logic matching
$uniqueName = uniqid() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $fileName);
$destination = $uploadDir . $uniqueName;

// Always use absolute URL for email compatibility
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" :
    "http://";
$host = $_SERVER['HTTP_HOST'];
// If on localhost but wanting external compatibility, one might hardcode but usually $host is fine if tunneled.
// However, the system seems to prefer automation.ideas.edu.vn as the primary domain.
if (strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false) {
    $baseUrl = "https://automation.ideas.edu.vn/uploadss/";
} else {
    $baseUrl = $protocol . $host . "/uploadss/";
}

$publicUrl = $baseUrl . $uniqueName;

if (move_uploaded_file($fileTmp, $destination)) {
    jsonResponse(true, [
        'name' => $fileName,
        'url' => $publicUrl,
        'size' => $fileSize,
        'type' => $fileExt,
        'path' => $destination // Internal path for worker
    ]);
} else {
    jsonResponse(false, null, 'Failed to move uploaded file');
}
?>