<?php
// api/delete_attachment.php
require_once 'db_connect.php';
require_once 'ai_org_middleware.php';

// SECURITY: Enforce Auth
$currentOrgUser = requireAISpaceAuth();

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

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, null, 'Method not allowed');
}

$input = json_decode(file_get_contents('php://input'), true);
$path = $input['path'] ?? '';

if (empty($path)) {
    jsonResponse(false, null, 'No path provided');
}

// Chống Directory Traversal
$realUploadDir = realpath('../uploadss/');
$realTarget = realpath($path);

// Nếu file tồn tại và nằm gọn trong thư mục uploadss
if ($realTarget && file_exists($realTarget) && strpos($realTarget, $realUploadDir) === 0) {
    if (unlink($realTarget)) {
        jsonResponse(true, null, 'Attachment deleted successfully');
    } else {
        jsonResponse(false, null, 'Failed to delete attachment from server');
    }
} else {
    // Nếu file không tồn tại, cứ coi như thao tác xoá đã xong
    jsonResponse(true, null, 'File not found or already deleted');
}
?>
