<?php
// api/manual_test_zns.php
// Script to Manually Test ZNS functionality
// Updated: Interactive UI for sending

require_once 'db_connect.php';
require_once 'zalo_sender.php';

// Override global JSON header from db_connect
header("Content-Type: text/html; charset=UTF-8");

echo "<style>
    body { font-family: sans-serif; max-width: 800px; margin: 20px auto; line-height: 1.6; }
    .success { color: green; background: #e6fffa; padding: 10px; border: 1px solid green; border-radius: 4px; }
    .error { color: red; background: #fff5f5; padding: 10px; border: 1px solid red; border-radius: 4px; }
    form { background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #ddd; }
    label { display: block; margin-bottom: 5px; font-weight: bold; }
    select, input, button { width: 100%; padding: 10px; margin-bottom: 15px; border-radius: 4px; border: 1px solid #ccc; font-size: 16px; }
    button { background: #0084ff; color: white; border: none; cursor: pointer; font-weight: bold; }
    button:hover { background: #0066cc; }
</style>";

echo "<h1>ZNS Manual Test Tool</h1>";

// 1. Get Active OA
$stmt = $pdo->query("SELECT * FROM zalo_oa_configs WHERE status = 'active' LIMIT 1");
$oa = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$oa) {
    die("<div class='error'>❌ No Active Zalo OA found. Please connect an OA first.</div>");
}

echo "<div>Active OA: <b>" . htmlspecialchars($oa['name']) . "</b></div><br>";

// 2. Refresh Token if needed
$tokenResult = getAccessToken($pdo, $oa['id']);
if (!$tokenResult['success']) {
    die("<div class='error'>❌ Failed to get Access Token: " . $tokenResult['message'] . "</div>");
}
$accessToken = $tokenResult['access_token'];

// 3. Fetch Templates from Local DB (faster & has params)
$stmt = $pdo->prepare("SELECT * FROM zalo_templates WHERE oa_config_id = ? AND status IN ('ENABLE', 'approved') ORDER BY updated_at DESC");
$stmt->execute([$oa['id']]);
$dbTemplates = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($dbTemplates)) {
    // Fallback to API
    $url = "https://business.openapi.zalo.me/template/all?offset=0&limit=100";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['access_token: ' . $accessToken, 'Content-Type: application/json']);
    $response = curl_exec($ch);
    curl_close($ch);
    $data = json_decode($response, true);
    $templates = $data['data'] ?? [];

    // Map API to DB keys
    foreach ($templates as &$t) {
        $t['template_id'] = $t['templateId'];
        $t['template_name'] = $t['templateName'];
        // $t['preview_data'] will be missing, so JS auto-fill won't work perfectly until sync
    }
    echo "<div class='info'>⚠️ Using live API list. Run <a href='zalo_templates.php?route=sync&oa_id={$oa['id']}'>Sync</a> to enable auto-fill.</div>";
} else {
    $templates = $dbTemplates;
}

// 4. Handle Form Submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Enable error reporting for debugging
    error_reporting(E_ALL);
    ini_set('display_errors', 1);

    try {
        $selectedTemplateId = $_POST['template_id'];
        $phone = $_POST['phone'];
        $recipientType = $_POST['recipient_type'] ?? 'phone'; // Capture type
        $manualParams = $_POST['manual_params'] ?? '';

        // Find template name for display
        $templateName = "Unknown";
        foreach ($templates as $t) {
            $tId = $t['template_id'] ?? $t['templateId'];
            if ($tId == $selectedTemplateId) {
                $templateName = $t['template_name'] ?? $t['templateName'];
                break;
            }
        }

        echo "<h3>Processing Sending...</h3>";
        echo "To: <b>$phone</b><br>";
        echo "Template: <b>$templateName</b> ($selectedTemplateId)<br>";

        $testData = [];

        // Priority 1: Use Manual JSON if provided
        if (!empty(trim($manualParams))) {
            $testData = json_decode($manualParams, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception("Invalid JSON in Manual Params: " . json_last_error_msg());
            }
        }
        // Priority 2: Auto-fetch details
        else {
            $detailUrl = "https://business.openapi.zalo.me/template/info?template_id=" . $selectedTemplateId;
            $ch = curl_init($detailUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            // GET request should NOT have Content-Type: application/json usually, and Zalo might reject it (-106)
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['access_token: ' . $accessToken]);
            $detailRes = curl_exec($ch);

            if (curl_errno($ch)) {
                echo "<div class='error'>CURL Error fetching details: " . curl_error($ch) . "</div>";
            }

            curl_close($ch);
            $detailData = json_decode($detailRes, true);

            if (isset($detailData['data']['listParams'])) {
                foreach ($detailData['data']['listParams'] as $param) {
                    $val = "Test " . $param['name'];

                    // Use Sample Value if available
                    if (isset($param['sample_value'])) {
                        $val = $param['sample_value'];
                    } else {
                        if (strpos(strtolower($param['name']), 'date') !== false)
                            $val = date('d/m/Y');
                        if (strpos(strtolower($param['name']), 'price') !== false)
                            $val = '100.000đ';
                        if (strpos(strtolower($param['name']), 'name') !== false)
                            $val = 'Bạn';
                    }

                    $testData[$param['name']] = $val;
                }
            } else {
                echo "<div class='error' style='color:orange'>Warning: Could not fetch params automatically. Zalo API response: " . htmlspecialchars(substr($detailRes, 0, 200)) . "...</div>";
            }
        }

        echo "Final Params: <pre>" . json_encode($testData, JSON_PRETTY_PRINT) . "</pre>";

        $mode = isset($_POST['dev_mode']) ? 'development' : null;
        if ($mode)
            echo "<b style='color:blue'>[DEVELOPMENT MODE ON]</b><br>";

        // Send
        $sendResult = null;
        if ($recipientType === 'uid') {
            $sendResult = sendZNSMessageByUID($pdo, $oa['id'], $selectedTemplateId, $phone, $testData);
        } else {
            $sendResult = sendZNSMessage($pdo, $oa['id'], $selectedTemplateId, $phone, $testData, null, null, null, $mode);
        }

        if ($sendResult['success']) {
            echo "<div class='success'>✅ <b>SEND SUCCESS!</b><br>Msg ID: " . ($sendResult['zalo_msg_id'] ?? 'N/A') . "</div>";
        } else {
            // Robust Error Handling for variable key names
            $err = $sendResult['error_message'] ?? $sendResult['message'] ?? 'Unknown Error';
            $code = $sendResult['error_code'] ?? $sendResult['status'] ?? 'N/A';

            echo "<div class='error'>❌ <b>SEND FAILED</b><br>Error: " . htmlspecialchars($err) . " (Code: " . htmlspecialchars($code) . ")</div>";

            // Helpful Hint for Missing Params
            if ($err && preg_match('/missing a parameter (\w+)/', $err, $matches)) {
                echo "<div class='error' style='border-color:orange; background:#fffaf0;'>💡 <b>HINT:</b> You are missing the parameter <b>{$matches[1]}</b>. Add it to the Manual Params JSON below!</div>";

                // Auto-fill form for next try (safely merge)
                $currentData = json_decode($manualParams, true) ?? $testData;
                $_POST['manual_params'] = json_encode(array_merge($currentData, [$matches[1] => "Test Value"]), JSON_PRETTY_PRINT);
            }
        }
    } catch (Exception $e) {
        echo "<div class='error'>🔥 <b>CRITICAL ERROR:</b> " . $e->getMessage() . "<br>Trace: <pre>" . $e->getTraceAsString() . "</pre></div>";
    }
    echo "<br><hr><br>";
}

// 5. Render Form
?>


<script>
    function onTemplateChange(select) {
        const option = select.options[select.selectedIndex];
        const paramsRaw = option.getAttribute('data-params');
        const textArea = document.querySelector('textarea[name="manual_params"]');

        if (paramsRaw && paramsRaw !== '[]' && paramsRaw !== 'null') {
            try {
                const params = JSON.parse(paramsRaw);
                const demoData = {};

                // Build key-value pairs from param definition
                if (Array.isArray(params)) {
                    params.forEach(p => {
                        let val = "Test " + p.name;
                        if (p.sample_value) val = p.sample_value;
                        else if (p.name.includes('date')) val = '<?php echo date('d/m/Y'); ?>';
                        else if (p.name.includes('price') || p.name.includes('amount')) val = '100000';
                        else if (p.name.includes('name')) val = 'Customer Name';

                        demoData[p.name] = val;
                    });
                }

                textArea.value = JSON.stringify(demoData, null, 4);
            } catch (e) {
                console.error("Error parsing params", e);
            }
        }
    }
</script>

<form method="POST">
    <label>Select Template:</label>
    <select name="template_id" required onchange="onTemplateChange(this)">
        <option value="">-- Choose Template --</option>
        <?php foreach ($templates as $tpl):
            // Fallback key names depending on source (DB vs API)
            $tId = $tpl['template_id'] ?? $tpl['templateId'];
            $tName = $tpl['template_name'] ?? $tpl['templateName'];
            $status = $tpl['status'] ?? 'UNKNOWN';
            $params = $tpl['preview_data'] ?? '[]'; // Only from DB
        
            // Relaxed check: Show all but warn visually
            $isGray = ($status != 'ENABLE' && $status != 'APPROVED' && $status != 'approved');

            $selected = (isset($_POST['template_id']) && $_POST['template_id'] == $tId) ? 'selected' : '';
            ?>
            <option value="<?php echo $tId; ?>" data-params='<?php echo htmlspecialchars($params, ENT_QUOTES); ?>' <?php echo $selected; ?>     <?php echo $isGray ? 'style="color:gray"' : ''; ?>>
                <?php echo htmlspecialchars($tName); ?> (<?php echo $tId; ?>) [
                <?php echo $status; ?>]
            </option>
        <?php endforeach; ?>
    </select>

    <label>Recipient Type:</label>



    <div style=" margin-bottom:15px;">
        <label style="display:inline; margin-right:20px;">
            <input type="radio" name="recipient_type" value="phone" <?php echo (!isset($_POST['recipient_type']) || $_POST['recipient_type'] == 'phone') ? 'checked' : ''; ?>
                onclick="document.getElementById('lbl_recipient').innerText = 'Phone Number:'"
                style="width:auto; display:inline;"> Phone Number
        </label>


        <label style="display:inline;">
            <input type="radio" name="recipient_type" value="uid" <?php echo (isset($_POST['recipient_type']) && $_POST['recipient_type'] == 'uid') ? 'checked' : ''; ?>
                onclick="document.getElementById('lbl_recipient').innerText = 'Zalo User ID:'"
                style="width:auto; display:inline;"> Zalo User ID
        </label>
    </div>


    <label
        id="lbl_recipient"><?php echo (isset($_POST['recipient_type']) && $_POST['recipient_type'] == 'uid') ? 'Zalo User ID:' : 'Phone Number:'; ?></label>
    <input type="text" name="phone"
        value="<?php echo isset($_POST['phone']) ? htmlspecialchars($_POST['phone']) : '0378859736'; ?>" required>

    <label>
        <input type="checkbox" name="dev_mode" value="1" <?php echo isset($_POST['dev_mode']) ? 'checked' : 'checked'; ?> style="width:auto;">
        <b>Use Development Mode</b> (Send to Admin/Tester without quota)
    </label>
    <br><br>

    <label>Manual Params (JSON - Optional):</label>
    <textarea name="manual_params" rows="5" style="width:100%; border:1px solid #ccc; font-family:monospace;"
        placeholder='{"customer_name": "Tuan", "order_code": "123"}'><?php echo isset($_POST['manual_params']) ? htmlspecialchars($_POST['manual_params']) : ''; ?></textarea>
    <small>Leave empty to auto-generate from Zalo API definition.</small>
    <br><br>

    <button type="submit">SEND TEST MESSAGE</button>
</form>