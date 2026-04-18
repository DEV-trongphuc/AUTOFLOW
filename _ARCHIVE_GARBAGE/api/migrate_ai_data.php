<?php
// api/migrate_ai_data.php
require_once 'db_connect.php';

header('Content-Type: text/html; charset=utf-8');

// --- SECURITY CHECK (Uncomment to secure) ---
// if (empty($_GET['secret']) || $_GET['secret'] !== 'YOUR_SECRET_KEY') {
//     die("Access Denied");
// }

$sourceId = $_GET['source'] ?? '';
$destId = $_GET['dest'] ?? '';
$confirm = $_GET['confirm'] ?? '';

echo "<h1>AI Data Migration Tool</h1>";
echo "<p>Use this tool to copy AI Settings & Training Data from one Property to another.</p>";

// 1. Helper to get property name
function getPropName($pdo, $id)
{
    if (!$id)
        return 'Unknown';
    $stmt = $pdo->prepare("SELECT bot_name FROM ai_chatbot_settings WHERE property_id = ?");
    $stmt->execute([$id]);
    $res = $stmt->fetch(PDO::FETCH_COLUMN);
    return $res ? $res : $id;
}

if (!$sourceId || !$destId) {
    echo "<form method='GET' style='background:#f1f5f9; padding:20px; border-radius:8px; max-width:500px;'>";
    echo "<h3>Select Properties</h3>";
    echo "<div><label>Source Property ID (DEV):</label><br><input type='text' name='source' style='width:100%;padding:8px;' placeholder='e.g. dev_property_uuid'></div><br>";
    echo "<div><label>Destination Property ID (PROD):</label><br><input type='text' name='dest' style='width:100%;padding:8px;' placeholder='e.g. prod_property_uuid'></div><br>";
    echo "<div style='color:red;font-size:12px;'>WARNING: All data in Destination will be erased and replaced!</div><br>";
    echo "<button type='submit' style='padding:10px 20px;background:blue;color:white;border:none;border-radius:4px;'>Preview Migration</button>";
    echo "</form>";

    // List available properties for convenience
    echo "<h3>Available Properties:</h3><ul>";
    try {
        $stmt = $pdo->query("SELECT property_id, bot_name, updated_at FROM ai_chatbot_settings ORDER BY updated_at DESC");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            echo "<li><strong>{$row['bot_name']}</strong> (ID: <span style='font-family:monospace;background:#eee;'>{$row['property_id']}</span>)</li>";
        }
    } catch (Exception $e) {
        echo "Error listing properties: " . $e->getMessage();
    }
    echo "</ul>";
    exit;
}

$sourceName = getPropName($pdo, $sourceId);
$destName = getPropName($pdo, $destId);

if ($confirm !== 'yes') {
    echo "<div style='background:#fee2e2; border:1px solid red; padding:20px; border-radius:8px; max-width:600px;'>";
    echo "<h2 style='color:red;margin-top:0;'>⚠️ CONFIRM DELETION</h2>";
    echo "<p>You are about to COPY data:</p>";
    echo "<ul><li>FROM: <strong>$sourceName</strong> ($sourceId)</li>";
    echo "<li>TO: <strong>$destName</strong> ($destId)</li></ul>";
    echo "<p>The following data on <strong>DESTINATION</strong> will be <strong style='color:red;'>PERMANENTLY DELETED</strong>:</p>";
    echo "<ul><li>All Chatbot Settings</li><li>All Training Documents</li><li>All Training Vectors/Chunks</li><li>Term Stats</li></ul>";
    echo "<form method='GET'>";
    echo "<input type='hidden' name='source' value='$sourceId'>";
    echo "<input type='hidden' name='dest' value='$destId'>";
    echo "<input type='hidden' name='confirm' value='yes'>";
    echo "<button type='submit' style='padding:12px 24px;background:red;color:white;border:none;border-radius:4px;font-weight:bold;cursor:pointer;'>I CONFIRM - OVERWRITE DATA</button>";
    echo "</form>";
    echo "</div>";
    exit;
}

// --- EXECUTION ---
echo "<pre style='background:#1e293b;color:#10b981;padding:20px;overflow:auto;max-height:600px;'>";
echo "Starting Migration...\n";

try {
    $pdo->beginTransaction();

    // 1. MIGRATE SETTINGS
    echo "1. Migrating Settings...\n";
    $stmtSourceSettings = $pdo->prepare("SELECT * FROM ai_chatbot_settings WHERE property_id = ?");
    $stmtSourceSettings->execute([$sourceId]);
    $sourceSettings = $stmtSourceSettings->fetch(PDO::FETCH_ASSOC);

    if (!$sourceSettings) {
        throw new Exception("Source Settings not found!");
    }

    // Remove ID/Created keys and set Dest ID
    $sourceSettings['property_id'] = $destId;
    unset($sourceSettings['created_at']); // keep original creation time? or set now?
    //$sourceSettings['updated_at'] = date('Y-m-d H:i:s');

    // Delete Dest Settings (or we can use INSERT ON DUPLICATE UPDATE logic, but DELETE is cleaner for 'Overwrite')
    $pdo->prepare("DELETE FROM ai_chatbot_settings WHERE property_id = ?")->execute([$destId]);

    // Insert new settings
    $columns = array_keys($sourceSettings);
    $placeholders = str_repeat('?,', count($columns) - 1) . '?';
    $sql = "INSERT INTO ai_chatbot_settings (" . implode(',', $columns) . ") VALUES ($placeholders)";
    $pdo->prepare($sql)->execute(array_values($sourceSettings));
    echo "   -> Settings Copied.\n";

    // 2. MIGRATE TRAINING DOCS (With ID Mapping)
    echo "2. Migrating Training Docs ...\n";

    // Clear Dest Docs & Chunks
    $pdo->prepare("DELETE FROM ai_training_chunks WHERE property_id = ?")->execute([$destId]);
    $pdo->prepare("DELETE FROM ai_training_docs WHERE property_id = ?")->execute([$destId]);
    echo "   -> Cleared old destination data.\n";

    // Fetch Source Docs
    $stmtDocs = $pdo->prepare("SELECT * FROM ai_training_docs WHERE property_id = ? ORDER BY parent_id ASC, id ASC");
    $stmtDocs->execute([$sourceId]);
    $sourceDocs = $stmtDocs->fetchAll(PDO::FETCH_ASSOC);

    $idMap = ['0' => '0']; // Map Old ID -> New ID

    foreach ($sourceDocs as $doc) {
        $oldId = $doc['id'];
        $newId = bin2hex(random_bytes(18)); // Generate new UUID
        $idMap[$oldId] = $newId;

        $doc['id'] = $newId;
        $doc['property_id'] = $destId;

        // Handle Parent ID (map it)
        $oldParent = $doc['parent_id'];
        if ($oldParent && isset($idMap[$oldParent])) {
            $doc['parent_id'] = $idMap[$oldParent];
        } else {
            $doc['parent_id'] = '0'; // Fallback if parent missing/orphaned
        }

        // Handle Metadata (Batch ID mapping for folders)
        if (!empty($doc['metadata'])) {
            $meta = json_decode($doc['metadata'], true);
            if (isset($meta['batch_id'])) {
                // If this is a folder root, we create a new batch_id? 
                // BUT chunks use batch_id logic sometimes. 
                // Ideally we map batch inputs too, but basic doc copy is usually enough.
            }
            $doc['metadata'] = json_encode($meta);
        }

        // Insert Doc
        $cols = array_keys($doc);
        $vals = array_values($doc);
        $phs = str_repeat('?,', count($cols) - 1) . '?';
        $pdo->prepare("INSERT INTO ai_training_docs (" . implode(',', $cols) . ") VALUES ($phs)")->execute($vals);

        echo "   -> Copied Doc: {$doc['name']} ($oldId -> $newId)\n";

        // 3. MIGRATE CHUNKS for this Doc
        // Fetch source chunks
        $stmtChunks = $pdo->prepare("SELECT * FROM ai_training_chunks WHERE doc_id = ?");
        $stmtChunks->execute([$oldId]);
        while ($chunk = $stmtChunks->fetch(PDO::FETCH_ASSOC)) {
            $chunk['id'] = bin2hex(random_bytes(18)); // New Chunk ID
            $chunk['doc_id'] = $newId; // Link to NEW Doc
            $chunk['property_id'] = $destId; // Dest Property

            $cCols = array_keys($chunk);
            $cVals = array_values($chunk);
            $cPhs = str_repeat('?,', count($cCols) - 1) . '?';
            $pdo->prepare("INSERT INTO ai_training_chunks (" . implode(',', $cCols) . ") VALUES ($cPhs)")->execute($cVals);
        }
    }
    echo "   -> All Docs & Chunks Copied.\n";

    // 4. MIGRATE TERM STATS
    echo "3. Migrating Term Stats...\n";
    $pdo->prepare("DELETE FROM ai_term_stats WHERE property_id = ?")->execute([$destId]);
    $stmtStats = $pdo->prepare("SELECT * FROM ai_term_stats WHERE property_id = ?");
    $stmtStats->execute([$sourceId]);

    // Batch insert stats
    $statsCount = 0;
    while ($stat = $stmtStats->fetch(PDO::FETCH_ASSOC)) {
        $stat['property_id'] = $destId;
        $pdo->prepare("INSERT INTO ai_term_stats (term, property_id, df, updated_at) VALUES (?, ?, ?, NOW())")
            ->execute([$stat['term'], $stat['property_id'], $stat['df']]);
        $statsCount++;
    }
    echo "   -> Copied $statsCount term stats.\n";

    $pdo->commit();
    echo "\n\n✅ MIGRATION SUCCESSFUL! <br><a href='migrate_ai_data.php'>Back</a>";

} catch (Exception $e) {
    if ($pdo->inTransaction())
        $pdo->rollBack();
    echo "\n\n❌ ERROR: " . $e->getMessage();
    echo "\nTrace: " . $e->getTraceAsString();
}

echo "</pre>";
