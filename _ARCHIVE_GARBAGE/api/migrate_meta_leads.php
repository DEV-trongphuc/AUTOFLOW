<?php
// api/migrate_meta_leads.php
require_once 'db_connect.php';

header('Content-Type: application/json');

$results = [
    'processed' => 0,
    'synced' => 0,
    'failed' => 0,
    'details' => []
];

try {
    // 1. Fetch all meta_subscribers
    $stmt = $pdo->query("SELECT * FROM meta_subscribers");
    $metaSubs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    require_once 'meta_sync_helpers.php';

    foreach ($metaSubs as $ms) {
        $results['processed']++;
        $updated = false;

        $newEmail = $ms['email'];
        $newPhone = $ms['phone'];
        $newName = $ms['name'];

        // 2. Scan Message Logs for this subscriber
        // We always scan to capture NOTES even if name/email/phone exist
        $stmtLogs = $pdo->prepare("SELECT content, created_at FROM meta_message_logs WHERE psid = ? AND page_id = ? AND direction = 'inbound' ORDER BY created_at ASC");
        $stmtLogs->execute([$ms['psid'], $ms['page_id']]);
        $logs = $stmtLogs->fetchAll(PDO::FETCH_ASSOC);

        $collectedNotes = [];
        $existingNotesRaw = $ms['notes'] ?? '';
        $existingNotes = json_decode($existingNotesRaw, true);

        if (!is_array($existingNotes)) {
            $existingNotes = !empty($existingNotesRaw) ? [
                [
                    'type' => 'manual_note',
                    'content' => $existingNotesRaw,
                    'created_at' => $ms['created_at'] ?? date('Y-m-d H:i:s')
                ]
            ] : [];
        }

        foreach ($logs as $log) {
            $text = $log['content'];
            if (!$text)
                continue;

            $lines = explode("\n", $text);
            $extraInfo = [];

            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line))
                    continue;

                $foundField = false;

                // Email Extraction
                if (preg_match('/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/', $line, $matches)) {
                    if (empty($newEmail)) {
                        $newEmail = $matches[0];
                        $updated = true;
                    }
                    $foundField = true;
                }

                // Phone Extraction (VN)
                $cleanedLine = str_replace([' ', '.', '-'], '', $line);
                if (preg_match('/(84|0[35789])([0-9]{8,10})\b/', $cleanedLine, $matches)) {
                    if (empty($newPhone)) {
                        $newPhone = $matches[0];
                        if (strpos($newPhone, '84') === 0) {
                            $newPhone = '0' . substr($newPhone, 2);
                        }
                        $updated = true;
                    }
                    $foundField = true;
                }

                // Name Extraction
                if (preg_match('/(?:Full\s*name|Họ\s*tên|Tên|Name):\s*([^\n\r,]+)/iu', $line, $matches)) {
                    if (empty($newName) || $newName === 'Facebook User') {
                        $newName = trim($matches[1]);
                        $updated = true;
                    }
                    $foundField = true;
                }

                // Extra Info (Potential Note)
                if (!$foundField && strpos($line, ':') !== false) {
                    $extraInfo[] = $line;
                }
            }

            // If we found extra info in this message, add to notes collection
            if (!empty($extraInfo)) {
                foreach ($extraInfo as $info) {
                    // Avoid duplicates in current batch
                    $uniqueKey = md5($info);
                    if (!isset($collectedNotes[$uniqueKey])) {
                        $collectedNotes[$uniqueKey] = [
                            'type' => 'meta_extra_info',
                            'content' => $info,
                            'created_at' => $log['created_at'] // Use specific log time
                        ];
                        $updated = true;
                    }
                }
            }
        }

        // Clean and Re-assemble Notes (Fixing existing dupes)
        // We will rebuild the entire list from unique items
        $uniqueItems = [];
        $uniqueHashes = [];

        // 1. Process existing notes
        foreach ($existingNotes as $n) {
            $content = is_array($n) ? ($n['content'] ?? '') : (string) $n;
            $hash = md5(trim($content));
            if (!isset($uniqueHashes[$hash]) && !empty($content)) {
                $uniqueHashes[$hash] = true;
                $uniqueItems[] = $n;
            }
        }

        // 2. Add new collected notes (only if unique)
        foreach ($collectedNotes as $n) {
            $hash = md5(trim($n['content']));
            if (!isset($uniqueHashes[$hash]) && !empty($n['content'])) {
                $uniqueHashes[$hash] = true;
                $uniqueItems[] = $n;
                // If this collected note wasn't in existing, then it's an update
                // (Note: logic is simplified; we force update to ensure cleanup)
            }
        }

        $finalNotes = $uniqueItems;

        // Force update if count differs (dedup happened) or we found new stuff
        if (count($finalNotes) !== count($existingNotes) || !empty($collectedNotes)) {
            $updated = true;
        }

        // 3. Update Meta Subscriber if new data found OR cleaned
        if ($updated) {
            $stmtUp = $pdo->prepare("UPDATE meta_subscribers SET email = ?, phone = ?, name = ?, first_name = COALESCE(first_name, ?), notes = ? WHERE id = ?");
            $stmtUp->execute([$newEmail, $newPhone, $newName, $newName, json_encode($finalNotes), $ms['id']]);
            $results['synced']++;
        }

        // 4. Always try to sync to Main Audience to ensure linking
        syncMetaToMain($pdo, $ms['id']);
    }

    echo json_encode(['success' => true, 'data' => $results]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
