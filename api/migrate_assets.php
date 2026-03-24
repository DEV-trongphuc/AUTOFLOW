<?php
// api/migrate_assets.php
require_once 'db_connect.php';
session_start();

$admin_id = $_SESSION['user_id'] ?? null;
if (!$admin_id) {
    echo "<div style='color: red;'>[DEBUG] No admin_id in session. Migration will tag assets with NULL admin.</div>";
} else {
    echo "<div style='color: green;'>[DEBUG] admin_id detected: $admin_id</div>";
}
$property_id = $_GET['property_id'] ?? null;
$group_id = $_GET['group_id'] ?? null;

if (!$property_id && !$group_id) {
    echo "<div style='color: orange;'>[NOTICE] No property_id or group_id provided. Using global mode.</div>";
}

echo "<h2>Assets Migration & Optimization (Reset Mode)</h2>";

try {
    // 1. SELECTIVE CLEANUP: Only clear records that haven't been manually deleted
    // This ensures that "Synchronize" doesn't restore files that the user explicitly removed (is_deleted = 1)
    if ($property_id) {
        if ($admin_id) {
            $stmtDel = $pdo->prepare("DELETE FROM global_assets WHERE property_id = ? AND admin_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)");
            $stmtDel->execute([$property_id, $admin_id]);
        } else {
            $stmtDel = $pdo->prepare("DELETE FROM global_assets WHERE property_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)");
            $stmtDel->execute([$property_id]);
        }
        echo "[SYNC] Cleared active assets for property: $property_id (Preserved deleted status)\n";
    } elseif ($group_id) {
        if ($admin_id) {
            $stmtDel = $pdo->prepare("DELETE FROM global_assets WHERE property_id IN (SELECT id FROM ai_chatbots WHERE category_id = ?) AND admin_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)");
            $stmtDel->execute([$group_id, $admin_id]);
        } else {
            $stmtDel = $pdo->prepare("DELETE FROM global_assets WHERE property_id IN (SELECT id FROM ai_chatbots WHERE category_id = ?) AND (is_deleted = 0 OR is_deleted IS NULL)");
            $stmtDel->execute([$group_id]);
        }
        echo "[SYNC] Cleared active assets for group: $group_id (Preserved deleted status)\n";
    } else {
        // Global mode: Only delete non-deleted records
        $pdo->exec("DELETE FROM global_assets WHERE (is_deleted = 0 OR is_deleted IS NULL)");
        echo "[SYNC] Non-deleted assets in 'global_assets' have been cleared for re-sync.\n";
    }

    // 2. Ensure table structure
    $createTableSqgl = "
    CREATE TABLE IF NOT EXISTS global_assets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        unique_name VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        type VARCHAR(100),
        extension VARCHAR(10),
        size BIGINT DEFAULT 0,
        source VARCHAR(50) DEFAULT 'workspace',
        chatbot_id VARCHAR(100) DEFAULT NULL,
        property_id VARCHAR(100) DEFAULT NULL,
        conversation_id VARCHAR(100) DEFAULT NULL,
        session_id VARCHAR(100) DEFAULT NULL,
        metadata JSON DEFAULT NULL,
        admin_id INT DEFAULT NULL,
        is_deleted TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_source (source),
        INDEX idx_type (type),
        INDEX idx_bot (chatbot_id),
        INDEX idx_property (property_id),
        INDEX idx_admin (admin_id),
        INDEX idx_deleted (is_deleted),
        UNIQUE KEY uk_unique_url (url(255))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    $pdo->exec($createTableSqgl);

    // Auto-migration for admin_id column if table existed
    try {
        $pdo->exec("ALTER TABLE global_assets ADD COLUMN IF NOT EXISTS admin_id INT DEFAULT NULL AFTER session_id");
        $pdo->exec("ALTER TABLE global_assets ADD INDEX IF NOT EXISTS idx_admin (admin_id)");
    } catch (Exception $e) {
        try {
            $pdo->exec("ALTER TABLE global_assets ADD COLUMN admin_id INT DEFAULT NULL AFTER session_id");
        } catch (Exception $e2) {
        }
        try {
            $pdo->exec("ALTER TABLE global_assets ADD INDEX idx_admin (admin_id)");
        } catch (Exception $e2) {
        }
    }

    // Helper to get mime type
    function getMimeType($ext)
    {
        $mimes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'pdf' => 'application/pdf',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls' => 'application/vnd.ms-excel',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'zip' => 'application/zip',
            'txt' => 'text/plain',
            'csv' => 'text/csv'
        ];
        return $mimes[strtolower($ext)] ?? 'application/octet-stream';
    }

    $count = 0;

    // 2. Scan ai_workspace_files -> Source: 'workspace' or 'chat_user'
    echo "<li>Scanning personal workspace files...</li>";
    $sqlW = "SELECT * FROM ai_workspace_files";
    if ($property_id) {
        $sqlW .= " WHERE property_id = " . $pdo->quote($property_id);
    } elseif ($group_id) {
        $sqlW .= " WHERE property_id IN (SELECT id FROM ai_chatbots WHERE category_id = " . $pdo->quote($group_id) . ")";
    }
    $stmtW = $pdo->query($sqlW);
    while ($row = $stmtW->fetch()) {
        $fileUrl = $row['file_url'];
        if ($fileUrl && strpos($fileUrl, '/uploadss/') !== false) {
            $parts = explode('/uploadss/', $fileUrl);
            if (isset($parts[1])) {
                $relativePath = urldecode($parts[1]);
                $localPath = realpath(__DIR__ . '/../uploadss/' . $relativePath);
                if (!$localPath || !file_exists($localPath)) {
                    continue; // Skip orphan or deleted file
                }
            }
        }

        $source = !empty($row['conversation_id']) ? 'chat_user' : 'workspace';
        $stmtIns = $pdo->prepare("INSERT IGNORE INTO global_assets (name, unique_name, url, type, extension, size, source, property_id, conversation_id, admin_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $ext = pathinfo($row['file_name'] ?? '', PATHINFO_EXTENSION);
        if (
            $stmtIns->execute([
                $row['file_name'],
                $row['file_name'],
                $row['file_url'],
                $row['file_type'],
                $ext,
                $row['file_size'],
                $source,
                $row['property_id'],
                $row['conversation_id'],
                $admin_id,
                $row['created_at']
            ])
        ) {
            if ($stmtIns->rowCount() > 0)
                $count++;
        }
    }

    // 3. Scan Messages -> Source: 'chat_user' or 'chat_assistant' (Chat-specific Attachments)
    echo "<li>Scanning messages for chat attachments...</li>";
    $msgTables = ['ai_messages' => 'ai_conversations', 'ai_org_messages' => 'ai_org_conversations'];
    foreach ($msgTables as $mTable => $cTable) {
        $sqlM = "SELECT m.message, m.created_at, m.conversation_id, m.metadata, m.sender, c.property_id 
                 FROM $mTable m 
                 LEFT JOIN $cTable c ON m.conversation_id = c.id
                 WHERE (m.message LIKE '%http%' OR m.metadata LIKE '%attachments%')";
        if ($property_id) {
            $sqlM .= " AND c.property_id = " . $pdo->quote($property_id);
        } elseif ($group_id) {
            $sqlM .= " AND c.property_id IN (SELECT id FROM ai_chatbots WHERE category_id = " . $pdo->quote($group_id) . ")";
        }
        $stmtM = $pdo->query($sqlM);
        while ($row = $stmtM->fetch()) {
            $source = ($row['sender'] === 'ai') ? 'chat_assistant' : 'chat_user';

            if (!empty($row['metadata'])) {
                $meta = json_decode($row['metadata'], true);
                if (!empty($meta['attachments']) && is_array($meta['attachments'])) {
                    foreach ($meta['attachments'] as $att) {
                        $attUrl = $att['previewUrl'] ?? $att['url'] ?? '';
                        if ($attUrl && strpos($attUrl, 'data:') !== 0) {
                            if (strpos($attUrl, '/uploadss/') !== false) {
                                $parts = explode('/uploadss/', $attUrl);
                                if (isset($parts[1])) {
                                    $relativePath = urldecode($parts[1]);
                                    $localPath = realpath(__DIR__ . '/../uploadss/' . $relativePath);
                                    if (!$localPath || !file_exists($localPath)) {
                                        continue; // File deleted from disk, skip migration
                                    }
                                }
                            }
                            $attName = $att['name'] ?? basename($attUrl);
                            $attType = $att['type'] ?? 'application/octet-stream';
                            $attExt = pathinfo($attName, PATHINFO_EXTENSION);
                            $attSize = $att['size'] ?? 0;
                            $ins = $pdo->prepare("INSERT IGNORE INTO global_assets (name, unique_name, url, type, extension, size, source, conversation_id, property_id, admin_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                            if ($ins->execute([$attName, $attName, $attUrl, $attType, $attExt, $attSize, $source, $row['conversation_id'], $row['property_id'], $admin_id, $row['created_at']])) {
                                if ($ins->rowCount() > 0)
                                    $count++;
                            }
                        }
                    }
                }
            }
            preg_match_all('/https?:\/\/[^\s\)\"\'<>]+/', $row['message'] ?? '', $matches);
            if (!empty($matches[0])) {
                foreach ($matches[0] as $url) {
                    $ext = strtolower(pathinfo(parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION));
                    $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'xlsx', 'docx', 'xls', 'doc', 'txt', 'csv'];
                    if (in_array($ext, $allowed)) {
                        $name = basename($url);
                        $mime = getMimeType($ext);
                        $ins = $pdo->prepare("INSERT IGNORE INTO global_assets (name, unique_name, url, type, extension, source, conversation_id, property_id, admin_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                        if ($ins->execute([$name, $name, $url, $mime, $ext, $source, $row['conversation_id'], $row['property_id'], $admin_id, $row['created_at']])) {
                            if ($ins->rowCount() > 0)
                                $count++;
                        }
                    }
                }
            }
        }
    }

    echo "<h3>Migration Complete!</h3>";
    echo "<div style='background: #f1f5f9; padding: 15px; border-radius: 8px; border: 1px solid #cbd5e1;'>
            <b>Số tệp đã được reset & migration:</b> <span style='color: #1d4ed8; font-size: 1.25rem;'>$count</span> tệp.
          </div>";

} catch (Exception $e) {
    echo "<div style='color: red;'>[ERROR] " . $e->getMessage() . "</div>";
}