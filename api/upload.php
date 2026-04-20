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

// GET: Thư viện file — liệt kê tất cả file đã upload
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['route']) && $_GET['route'] === 'library') {
    $uploadDir = '../uploadss/';
    if (!is_dir($uploadDir)) {
        jsonResponse(true, []);
    }
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443)
        ? "https://" : "http://";
    $host = $_SERVER['HTTP_HOST'];
    $baseUrl = (strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false)
        ? "https://automation.ideas.edu.vn/uploadss/"
        : $protocol . $host . "/uploadss/";

    $allowed = ['jpg','jpeg','png','gif','webp','pdf','doc','docx','xls','xlsx','zip','txt','csv'];
    $files = [];
    try {
        foreach (new DirectoryIterator($uploadDir) as $f) {
            if ($f->isDot() || $f->isDir()) continue;
            $fn  = $f->getFilename();
        $ext = strtolower(pathinfo($fn, PATHINFO_EXTENSION));
        if (!in_array($ext, $allowed)) continue;
        // Strip uniqid prefix (13 hex chars + _)
        $origName = preg_replace('/^[a-f0-9]{13}_/', '', $fn);
        $files[] = [
            'name'        => $origName,
            'uniqueName'  => $fn,
            'url'         => $baseUrl . $fn,
            'path'        => $uploadDir . $fn,
            'size'        => $f->getSize(),
            'type'        => $ext,
            'modified_at' => $f->getMTime(),
        ];
        }
    } catch (Exception $e) {
        error_log("DirectoryIterator error: " . $e->getMessage());
    }
    usort($files, fn($a, $b) => $b['modified_at'] - $a['modified_at']);
    jsonResponse(true, array_slice($files, 0, 300));
}

// DELETE (via GET với route=delete): Xóa file khỏi thư viện
if (isset($_GET['route']) && $_GET['route'] === 'delete') {
    $rawName  = $_GET['file'] ?? '';
    // SECURITY: chỉ lấy basename để ngăn path traversal (../, /, \)
    $safeName = basename($rawName);
    if (empty($safeName) || $safeName !== $rawName || strpbrk($safeName, '/\\') !== false) {
        jsonResponse(false, null, 'Tên file không hợp lệ');
    }
    $uploadDir = '../uploadss/';
    $filePath  = $uploadDir . $safeName;
    if (!file_exists($filePath)) {
        jsonResponse(false, null, 'File không tồn tại');
    }
    if (unlink($filePath)) {
        jsonResponse(true, ['deleted' => $safeName]);
    } else {
        jsonResponse(false, null, 'Không thể xóa file');
    }
}

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

// [FIX P16-B3] Null-byte guard: "shell.php\0.jpg" → pathinfo() sees ".jpg" but storage sees "shell.php"
if (strpos($fileName, "\0") !== false) {
    jsonResponse(false, null, 'Invalid filename');
}

$fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

if (!in_array($fileExt, $allowedExts)) {
    jsonResponse(false, null, 'File type not allowed');
}

// [FIX P16-B3] MIME type validation — extension alone can be faked.
// Verify actual file content matches allowed types.
$allowedMimes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',                                                            // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',      // .docx
    'application/vnd.ms-excel',                                                     // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',            // .xlsx
    'application/zip', 'application/x-zip-compressed',
    'text/plain', 'text/csv', 'application/csv',
    'application/octet-stream', // fallback for some docx/xlsx on older systems
];
if (function_exists('finfo_open')) {
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $detectedMime = finfo_file($finfo, $fileTmp);
    finfo_close($finfo);
    if (!in_array($detectedMime, $allowedMimes)) {
        jsonResponse(false, null, 'File content does not match allowed types (' . $detectedMime . ')');
    }
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
