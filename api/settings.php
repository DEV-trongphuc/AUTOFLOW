<?php
require_once 'db_connect.php';
require_once 'auth_middleware.php'; // [FIX] Settings are workspace-specific, require auth
apiHeaders();

// workspace_id: integer (0 = global/shared, >0 = workspace-specific)
$workspace_id = (int) get_current_workspace_id();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Load global (0) settings first, then overlay with workspace-specific rows
            // This allows SMTP/API keys (workspace_id=0) to be read by all workspaces
            // while workspace-specific overrides take precedence
            $stmt = $pdo->prepare("
                SELECT `key`, `value` 
                FROM system_settings 
                WHERE workspace_id IN (0, ?)
                ORDER BY workspace_id ASC
            ");
            $stmt->execute([$workspace_id]);
            $settings = [];
            foreach ($stmt->fetchAll() as $row) {
                // Later rows (workspace-specific, higher workspace_id) overwrite global keys
                $settings[$row['key']] = $row['value'];
            }
            jsonResponse(true, $settings);
            break;

        case 'POST':
            $data = json_decode(file_get_contents("php://input"), true);
            if (!$data)
                jsonResponse(false, null, 'Không có dữ liệu để cập nhật');
            $pdo->beginTransaction();
            try {
                // Upsert scoped to this workspace_id
                // ON DUPLICATE KEY works because (workspace_id, key) is composite PK
                $stmt = $pdo->prepare("
                    INSERT INTO system_settings (`workspace_id`, `key`, `value`) 
                    VALUES (?, ?, ?) 
                    ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), `updated_at` = NOW()
                ");
                foreach ($data as $key => $value) {
                    $stmt->execute([$workspace_id, $key, (string) $value]);
                }
                $pdo->commit();
                jsonResponse(true, $data, 'Cập nhật cấu hình thành công');
            } catch (Exception $e) {
                if ($pdo->inTransaction())
                    $pdo->rollBack();
                jsonResponse(false, null, 'Lỗi khi lưu cấu hình: ' . $e->getMessage());
            }
            break;

        default:
            jsonResponse(false, null, 'Method không hỗ trợ');
    }
} catch (Exception $e) {
    jsonResponse(false, null, 'Lỗi hệ thống: ' . $e->getMessage());
}
?>