<?php
require_once 'db_connect.php';
apiHeaders();

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $stmt = $pdo->query("SELECT * FROM system_settings");
            $settings = [];
            foreach ($stmt->fetchAll() as $row) {
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
                $stmt = $pdo->prepare("INSERT INTO system_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)");
                foreach ($data as $key => $value) {
                    $stmt->execute([$key, (string) $value]);
                }
                $pdo->commit();
                jsonResponse(true, $data, 'Cập nhật cấu hình thành công');
            } catch (Exception $e) {
                if ($pdo->inTransaction())
                    $pdo->rollBack();
                jsonResponse(false, null, 'Lỗi khi lưu cấu hình: ' . $e->getMessage());
            }
            break;
    }
} catch (Exception $e) {
    jsonResponse(false, null, 'Lỗi hệ thống: ' . $e->getMessage());
}
?>