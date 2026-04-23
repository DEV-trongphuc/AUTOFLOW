<?php
require_once 'db_connect.php';
require_once 'auth_middleware.php';

apiHeaders();

$workspace_id = get_current_workspace_id();
$method = $_SERVER['REQUEST_METHOD'];
$path = isset($_GET['id']) ? $_GET['id'] : null;

function formatTemplate($row)
{
    $row['blocks'] = json_decode($row['blocks'] ?? '[]');
    $row['bodyStyle'] = json_decode($row['body_style'] ?? '{}');
    $row['htmlContent'] = $row['html_content'];
    $row['lastModified'] = $row['updated_at'];
    $row['groupId'] = $row['group_id'] ?? null;
    unset($row['body_style'], $row['html_content'], $row['updated_at'], $row['group_id']);
    return $row;
}

function getTemplateUsage($id, $pdo, $workspace_id)
{
    $usage = [];

    // 1. Check active campaigns
    $stmt = $pdo->prepare("SELECT name FROM campaigns WHERE template_id = ? AND workspace_id = ? AND status NOT IN ('sent', 'archived') AND is_deleted = 0");
    $stmt->execute([$id, $workspace_id]);
    $campaigns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    if ($campaigns) {
        $usage[] = "Campaigns: " . implode(', ', $campaigns);
    }

    // 2. Check campaign reminders
    $stmt = $pdo->prepare("SELECT cr.subject, c.name FROM campaign_reminders cr JOIN campaigns c ON cr.campaign_id = c.id WHERE cr.template_id = ? AND c.workspace_id = ? AND c.status NOT IN ('sent', 'archived') AND c.is_deleted = 0");
    $stmt->execute([$id, $workspace_id]);
    $reminders = $stmt->fetchAll();
    if ($reminders) {
        $remTexts = array_map(fn($r) => "{$r['subject']} ({$r['name']})", $reminders);
        $usage[] = "Reminders: " . implode(', ', $remTexts);
    }

    // 3. Check active flows
    $stmt = $pdo->prepare("SELECT name FROM flows WHERE steps LIKE ? AND workspace_id = ? AND status IN ('active', 'paused')");
    $stmt->execute(['%"templateId":"' . $id . '"%', $workspace_id]);
    $flows = $stmt->fetchAll(PDO::FETCH_COLUMN);
    if ($flows) {
        $usage[] = "Flows: " . implode(', ', $flows);
    }

    return $usage;
}

try {
    switch ($method) {
        case 'GET':
            if (session_id()) session_write_close();
            if (isset($_GET['action']) && $_GET['action'] === 'check_usage' && $path) {
                $usage = getTemplateUsage($path, $pdo, $workspace_id);
                jsonResponse(true, ['in_use' => !empty($usage), 'details' => $usage]);
                return;
            }

            if ($path) {
                $stmt = $pdo->prepare("SELECT * FROM templates WHERE id = ? AND workspace_id = ?");
                $stmt->execute([$path, $workspace_id]);
                $tpl = $stmt->fetch();
                $tpl ? jsonResponse(true, formatTemplate($tpl)) : jsonResponse(false, null, 'Không tìm thấy mẫu email');
            } else {
                $stmt = $pdo->prepare("SELECT * FROM templates WHERE workspace_id = ? ORDER BY updated_at DESC");
                $stmt->execute([$workspace_id]);
                $tpls = $stmt->fetchAll();
                jsonResponse(true, array_map('formatTemplate', $tpls));
            }
            break;

        case 'POST':
            $data = json_decode(file_get_contents("php://input"), true);
            $id = $data['id'] ?? uniqid();
            $blocks = json_encode($data['blocks'] ?? []);
            $style = json_encode($data['bodyStyle'] ?? (object) []);
            $groupId = $data['groupId'] ?? null;

            $sql = "INSERT INTO templates (workspace_id, id, name, thumbnail, category, group_id, blocks, body_style, html_content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$workspace_id, $id, $data['name'], $data['thumbnail'], $data['category'], $groupId, $blocks, $style, $data['htmlContent']]);

            $data['id'] = $id;
            jsonResponse(true, $data, 'Đã lưu mẫu email mới');
            break;

        case 'PUT':
            $data = json_decode(file_get_contents("php://input"), true);

            // Handle bulk move to group
            if (isset($data['bulk_action']) && $data['bulk_action'] === 'move_to_group') {
                $ids = $data['ids'] ?? [];
                $newGroupId = $data['group_id'] ?? null;
                if (empty($ids))
                    jsonResponse(false, null, 'Không có mẫu nào được chọn');

                $placeholders = implode(',', array_fill(0, count($ids), '?'));
                $sql = "UPDATE templates SET group_id = ?, updated_at = NOW() WHERE id IN ($placeholders) AND workspace_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute(array_merge([$newGroupId], $ids, [$workspace_id]));

                jsonResponse(true, null, 'Đã di chuyển ' . count($ids) . ' mẫu vào nhóm');
                break;
            }

            if (!$path)
                jsonResponse(false, null, 'Thiếu ID mẫu email');

            $blocks = json_encode($data['blocks'] ?? []);
            $style = json_encode($data['bodyStyle'] ?? (object) []);
            $groupId = $data['groupId'] ?? null;

            $sql = "UPDATE templates SET name=?, thumbnail=?, category=?, group_id=?, blocks=?, body_style=?, html_content=?, updated_at=NOW() WHERE id=? AND workspace_id=?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$data['name'], $data['thumbnail'], $data['category'], $groupId, $blocks, $style, $data['htmlContent'], $path, $workspace_id]);

            jsonResponse(true, $data, 'Đã cập nhật mẫu email');
            break;

        case 'DELETE':
            $data = json_decode(file_get_contents("php://input"), true);
            $ids = $path ? [$path] : ($data['ids'] ?? []);

            if (empty($ids))
                jsonResponse(false, null, 'Thiếu ID mẫu email');

            $inUseCount = 0;
            $deletedCount = 0;
            $errors = [];

            foreach ($ids as $id) {
                $usage = getTemplateUsage($id, $pdo, $workspace_id);
                if (!empty($usage)) {
                    $inUseCount++;
                    $stmt = $pdo->prepare("SELECT name FROM templates WHERE id = ? AND workspace_id = ?");
                    $stmt->execute([$id, $workspace_id]);
                    $name = $stmt->fetchColumn();
                    $errors[] = "Mẫu '{$name}' đang được sử dụng trong: " . implode('; ', $usage);
                    continue;
                }

                $stmt = $pdo->prepare("DELETE FROM templates WHERE id = ? AND workspace_id = ?");
                $stmt->execute([$id, $workspace_id]);
                if ($stmt->rowCount() > 0)
                    $deletedCount++;
            }

            if ($inUseCount > 0) {
                $msg = $deletedCount > 0
                    ? "Đã xóa {$deletedCount} mẫu. Không thể xóa {$inUseCount} mẫu do đang được sử dụng."
                    : "Không thể xóa mẫu thiết kế đang được sử dụng.";
                jsonResponse(false, ['errors' => $errors], $msg);
            } else {
                jsonResponse(true, ['deleted' => $deletedCount], $deletedCount > 1 ? "Đã xóa {$deletedCount} mẫu email" : "Đã xóa mẫu email");
            }
            break;
    }
} catch (Exception $e) {
    jsonResponse(false, null, 'Lỗi hệ thống, vui lòng thử lại.');
}
?>
