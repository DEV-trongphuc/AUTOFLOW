<?php
require_once 'db_connect.php';
apiHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$path = isset($_GET['id']) ? $_GET['id'] : null;

try {
    switch ($method) {
        case 'GET':
            if ($path) {
                $stmt = $pdo->prepare("SELECT * FROM template_groups WHERE id = ?");
                $stmt->execute([$path]);
                $group = $stmt->fetch();
                $group ? jsonResponse(true, $group) : jsonResponse(false, null, 'Không tìm thấy nhóm');
            } else {
                $stmt = $pdo->query("SELECT * FROM template_groups ORDER BY name ASC");
                jsonResponse(true, $stmt->fetchAll());
            }
            break;

        case 'POST':
            $data = json_decode(file_get_contents("php://input"), true);
            $id = $data['id'] ?? uniqid();
            $name = trim($data['name'] ?? '');

            if (!$name) {
                jsonResponse(false, null, 'Tên nhóm không được để trống');
            }

            $stmt = $pdo->prepare("INSERT INTO template_groups (id, name, created_at, updated_at) VALUES (?, ?, NOW(), NOW())");
            $stmt->execute([$id, $name]);

            jsonResponse(true, ['id' => $id, 'name' => $name], 'Đã tạo nhóm thành công');
            break;

        case 'PUT':
            if (!$path)
                jsonResponse(false, null, 'Thiếu ID nhóm');
            $data = json_decode(file_get_contents("php://input"), true);
            $name = trim($data['name'] ?? '');

            if (!$name) {
                jsonResponse(false, null, 'Tên nhóm không được để trống');
            }

            $stmt = $pdo->prepare("UPDATE template_groups SET name = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$name, $path]);

            jsonResponse(true, ['id' => $path, 'name' => $name], 'Đã cập nhật nhóm');
            break;

        case 'DELETE':
            if (!$path)
                jsonResponse(false, null, 'Thiếu ID nhóm');

            // Unlink templates from this group before deleting
            $stmtUnlink = $pdo->prepare("UPDATE templates SET group_id = NULL WHERE group_id = ?");
            $stmtUnlink->execute([$path]);

            $stmt = $pdo->prepare("DELETE FROM template_groups WHERE id = ?");
            $stmt->execute([$path]);

            jsonResponse(true, ['id' => $path], 'Đã xóa nhóm');
            break;
    }
} catch (Exception $e) {
    jsonResponse(false, null, 'Lỗi hệ thống: ' . $e->getMessage());
}
?>